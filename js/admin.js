// =============================================
// Admin Logic - متجر النور
// =============================================

let adminCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        window.location.href = '/admin/login.html';
        return;
    }

    loadDashboardStats();
    loadCategoriesForSelect();
    
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
});

// --- Tab Switching ---
function switchTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';

    if (tabId === 'orders') loadOrders();
    if (tabId === 'products') loadAdminProducts();
}

// --- Dashboard Stats ---
async function loadDashboardStats() {
    const { count: ordersCount } = await db.from('orders').select('*', { count: 'exact', head: true });
    const { count: productsCount } = await db.from('products').select('*', { count: 'exact', head: true });
    const { data: salesData } = await db.from('orders').select('total_amount').eq('status', 'confirmed');

    const totalSales = salesData ? salesData.reduce((sum, order) => sum + Number(order.total_amount), 0) : 0;

    document.getElementById('stat-orders').textContent = ordersCount || 0;
    document.getElementById('stat-products').textContent = productsCount || 0;
    document.getElementById('stat-sales').textContent = formatPrice(totalSales);
}

// --- Orders Management ---
async function loadOrders() {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">جاري التحميل...</td></tr>';

    const { data, error } = await db
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">خطأ في التحميل</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(order => `
        <tr>
            <td>#${order.order_number}</td>
            <td>${order.customer_name}<br><small style="color:var(--text-muted)">${order.customer_phone}</small></td>
            <td style="color:var(--gold-light); font-family:var(--font-en);">${formatPrice(order.total_amount)}</td>
            <td style="font-family:var(--font-en);">${new Date(order.created_at).toLocaleDateString('ar-EG')}</td>
            <td>
                <span class="status-badge status-${order.status}">
                    ${order.status === 'pending' ? 'قيد المراجعة' : order.status === 'confirmed' ? 'مؤكد' : order.status}
                </span>
            </td>
            <td>
                <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" 
                    onclick="updateOrderStatus('${order.id}', '${order.status === 'pending' ? 'confirmed' : 'pending'}')">
                    تغيير الحالة
                </button>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderId, newStatus) {
    const { error } = await db.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
        showToast('حدث خطأ', 'error');
    } else {
        showToast('تم تحديث الحالة');
        loadOrders();
    }
}

// --- Products Management ---
async function loadCategoriesForSelect() {
    const { data } = await db.from('categories').select('*');
    if (data) {
        adminCategories = data;
        const select = document.getElementById('prod-category');
        select.innerHTML = data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

async function loadAdminProducts() {
    const tbody = document.getElementById('products-tbody');
    const { data } = await db.from('products').select('*, categories(name)').order('created_at', { ascending: false });
    
    if(!data) return;

    tbody.innerHTML = data.map(prod => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    ${prod.image_url ? `<img src="${prod.image_url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">` : '🏺'}
                    ${prod.name}
                </div>
            </td>
            <td style="font-family:var(--font-en);">${formatPrice(prod.price)}</td>
            <td>${prod.categories?.name || '-'}</td>
            <td>${prod.is_available ? '✅' : '❌'}</td>
            <td>
                <button class="btn-secondary" style="padding: 4px 8px;" onclick="deleteProduct('${prod.id}')">حذف</button>
            </td>
        </tr>
    `).join('');
}

function openProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    document.getElementById('modal-title').textContent = 'إضافة منتج';
    document.getElementById('product-modal').classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'جاري الحفظ... ⏳';

    const id = document.getElementById('prod-id').value;
    const fileInput = document.getElementById('prod-image-file');
    
    let imageUrl = null;

    try {
        // 1. Upload Image if a new file is selected
        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `products/${fileName}`;

            btn.innerHTML = 'جاري رفع الصورة... ⏳';
            const { error: uploadError } = await db.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = db.storage
                .from('products')
                .getPublicUrl(filePath);
            
            imageUrl = publicUrl;
        }

        const productData = {
            name: document.getElementById('prod-name').value,
            price: document.getElementById('prod-price').value,
            category_id: document.getElementById('prod-category').value,
            description: document.getElementById('prod-desc').value,
            is_available: true
        };

        // Only update image_url if a new one was uploaded
        if (imageUrl) {
            productData.image_url = imageUrl;
        }

        let error;
        if (id) {
            const res = await db.from('products').update(productData).eq('id', id);
            error = res.error;
        } else {
            const res = await db.from('products').insert([productData]);
            error = res.error;
        }

        if (error) throw error;

        showToast('تم الحفظ بنجاح');
        closeModal('product-modal');
        loadAdminProducts();
        loadDashboardStats();
    } catch (err) {
        console.error('Error saving product:', err);
        showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteProduct(id) {
    if(confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        const { error } = await db.from('products').delete().eq('id', id);
        if(!error) {
            showToast('تم الحذف');
            loadAdminProducts();
            loadDashboardStats();
        }
    }
}

// --- Auth ---
async function logout() {
    await db.auth.signOut();
    window.location.href = '/admin/login.html';
}
