// =============================================
// Cart Logic - الرايق لبيع الانتيكات والتحف
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    CartManager.updateCartBadge();
    renderCart();
});

function renderCart() {
    const cart = CartManager.getCart();
    const container = document.getElementById('cart-items-container');
    const summaryContainer = document.getElementById('cart-summary-container');
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state animate-in">
                <div class="empty-state-icon">🛒</div>
                <h3>السلة فارغة</h3>
                <p>لم تقم بإضافة أي منتجات للسلة بعد</p>
                <a href="./index.html" class="btn-secondary" style="margin-top: 16px;">
                    تصفح المنتجات
                </a>
            </div>
        `;
        summaryContainer.style.display = 'none';
        return;
    }

    summaryContainer.style.display = 'block';
    
    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item animate-in" style="animation-delay: ${index * 0.1}s">
            <button class="cart-item-remove" onclick="removeItem('${item.id}')">✕</button>
            ${item.image 
                ? `<img src="${item.image}" alt="${item.name}" class="cart-item-image">`
                : `<div class="cart-item-image" style="display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--text-muted)">🏺</div>`
            }
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                </div>
            </div>
        </div>
    `).join('');

    updateSummary();
}

function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;
    CartManager.updateQuantity(productId, newQuantity);
    renderCart();
}

function removeItem(productId) {
    if(confirm('هل أنت متأكد من حذف هذا المنتج من السلة؟')) {
        CartManager.removeItem(productId);
        renderCart();
        showToast('تم حذف المنتج', 'success');
    }
}

function clearCartConfirm() {
    if (CartManager.getCart().length === 0) return;
    if(confirm('هل تريد تفريغ السلة بالكامل؟')) {
        CartManager.clearCart();
        renderCart();
        showToast('تم تفريغ السلة');
    }
}

function updateSummary() {
    const total = CartManager.getTotal();
    document.getElementById('subtotal-price').textContent = formatPrice(total);
    document.getElementById('total-price').textContent = formatPrice(total);
}
