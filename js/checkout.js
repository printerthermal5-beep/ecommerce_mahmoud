// =============================================
// Checkout & WhatsApp Logic - متجر النور
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const cart = CartManager.getCart();
    
    // Redirect if cart is empty
    if (cart.length === 0) {
        window.location.href = './cart.html';
        return;
    }

    // Auto-fill Customer Info if exists
    const savedCustomer = CustomerManager.getInfo();
    if (savedCustomer) {
        if (savedCustomer.name) document.getElementById('cust-name').value = savedCustomer.name;
        if (savedCustomer.phone) document.getElementById('cust-phone').value = savedCustomer.phone;
        if (savedCustomer.address) document.getElementById('cust-address').value = savedCustomer.address;
    }

    renderOrderSummary(cart);

    const form = document.getElementById('checkout-form');
    if (form) {
        form.addEventListener('submit', handleCheckoutSubmit);
    }
});

function renderOrderSummary(cart) {
    const container = document.getElementById('checkout-items');
    const totalEl = document.getElementById('checkout-total');
    
    container.innerHTML = cart.map(item => `
        <div class="order-item-row">
            <span>${item.quantity} × ${item.name}</span>
            <span class="item-total">${formatPrice(item.price * item.quantity)}</span>
        </div>
    `).join('');

    totalEl.textContent = formatPrice(CartManager.getTotal());
}

function validateForm() {
    let isValid = true;
    
    const name = document.getElementById('cust-name');
    const phone = document.getElementById('cust-phone');
    const address = document.getElementById('cust-address');
    
    // Reset errors
    document.querySelectorAll('.form-input, .form-textarea').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach(el => el.style.display = 'none');

    if (name.value.trim().length < 3) {
        name.classList.add('error');
        document.getElementById('name-error').style.display = 'block';
        isValid = false;
    }

    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(phone.value.trim())) {
        phone.classList.add('error');
        document.getElementById('phone-error').style.display = 'block';
        isValid = false;
    }

    if (address.value.trim().length < 10) {
        address.classList.add('error');
        document.getElementById('address-error').style.display = 'block';
        isValid = false;
    }

    return isValid;
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) return;

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'جاري تسجيل الطلب... ⏳';

    const cart = CartManager.getCart();
    const totalAmount = CartManager.getTotal();
    
    const customerName = document.getElementById('cust-name').value.trim();
    const customerPhone = document.getElementById('cust-phone').value.trim();
    const customerAddress = document.getElementById('cust-address').value.trim();

    // Auto-save Customer info
    CustomerManager.saveInfo({
        name: customerName,
        phone: customerPhone,
        address: customerAddress
    });

    const customerData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        customer_notes: document.getElementById('cust-notes').value.trim(),
        total_amount: totalAmount
    };

    try {
        // 1. Create Order
        const { data: orderData, error: orderError } = await db
            .from('orders')
            .insert([customerData])
            .select()
            .single();

        if (orderError) throw orderError;

        // 2. Create Order Items
        const orderItems = cart.map(item => ({
            order_id: orderData.id,
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity
        }));

        const { error: itemsError } = await db
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            // Best-effort cleanup: remove the just-created order so a retry
            // does not leave behind an empty/duplicate order
            await db.from('orders').delete().eq('id', orderData.id).catch(() => {});
            throw itemsError;
        }

        // Save order locally for "My Orders" history page
        OrderStorageManager.saveOrder({
            id: orderData.id,
            order_number: orderData.order_number,
            date: new Date().toISOString(),
            total_amount: totalAmount,
            status: 'pending',
            items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
        });

        // 3. Success -> WhatsApp
        showSuccessState(orderData.order_number, customerData, cart, totalAmount);
        
    } catch (error) {
        console.error('Checkout error:', error);
        showToast('حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة مرة أخرى', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'تأكيد الطلب <span>✓</span>';
    }
}

function showSuccessState(orderNumber, customerData, cart, totalAmount) {
    document.getElementById('checkout-main').style.display = 'none';
    document.getElementById('success-main').style.display = 'block';
    document.getElementById('order-id-display').textContent = `#${orderNumber}`;

    CartManager.clearCart();

    // Generate WhatsApp Message
    const waMessage = formatWhatsAppMessage(orderNumber, customerData, cart, totalAmount);
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;

    // Fallback link in case the browser blocks the auto-open popup
    const waFallback = document.getElementById('wa-fallback-btn');
    if (waFallback) waFallback.href = waUrl;

    // Open WhatsApp after a short delay
    setTimeout(() => {
        window.open(waUrl, '_blank');
    }, 1500);
}

function formatWhatsAppMessage(orderNumber, customer, cart, total) {
    let msg = `🛒 *طلب جديد من متجر النور* (#${orderNumber})\n`;
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `👤 الاسم: ${customer.customer_name}\n`;
    msg += `📱 التليفون: ${customer.customer_phone}\n`;
    msg += `📍 العنوان: ${customer.customer_address}\n`;
    if (customer.customer_notes) {
        msg += `📝 ملاحظات: ${customer.customer_notes}\n`;
    }
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `📦 *تفاصيل الطلب:*\n\n`;
    
    cart.forEach((item, index) => {
        msg += `${index + 1}️⃣ ${item.name}\n`;
        msg += `   الكمية: ${item.quantity} × ${item.price} ج.م\n`;
    });
    
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `💰 *الإجمالي: ${total} ج.م*\n`;
    msg += `━━━━━━━━━━━━━━━\n`;
    msg += `برجاء تأكيد الطلب. شكراً لثقتكم! ✨`;
    
    return msg;
}
