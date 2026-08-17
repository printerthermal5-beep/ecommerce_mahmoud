// =============================================
// Admin Logic - متجر النور (Mobile Responsive UX)
// =============================================

let adminCategories = [];
let allOrdersCache = [];
let allProductsCache = [];
let currentStatusFilter = 'all';
let currentOrdersSearchQuery = '';
let currentProductsSearchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        window.location.href = './login.html';
        return;
    }

    loadDashboardStats();
    loadCategoriesForSelect();
    
    const prodForm = document.getElementById('product-form');
    if (prodForm) prodForm.addEventListener('submit', handleProductSubmit);
    
    const catForm = document.getElementById('category-form');
    if (catForm) catForm.addEventListener('submit', handleCategorySubmit);
});

// --- Tab Switching ---
function switchTab(tabId) {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    // Update Desktop Sidebar Active Link
    document.querySelectorAll('.sidebar .nav-link').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('onclick')?.includes(`'${tabId}'`)) {
            l.classList.add('active');
        }
    });

    // Update Mobile Bottom Nav Active Item
    document.querySelectorAll('.admin-bottom-nav .admin-nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick')?.includes(`'${tabId}'`)) {
            btn.classList.add('active');
        }
    });

    // Hide all tabs & show target tab
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.style.display = 'block';

    // Load data lazily
    if (tabId === 'orders') loadOrders();
    if (tabId === 'products') loadAdminProducts();
    if (tabId === 'categories') loadAdminCategories();
    if (tabId === 'dashboard') loadDashboardStats();
}

// --- Dashboard Stats & Overview ---
async function loadDashboardStats() {
    const { count: ordersCount } = await db.from('orders').select('*', { count: 'exact', head: true });
    const { count: productsCount } = await db.from('products').select('*', { count: 'exact', head: true });
    const { count: categoriesCount } = await db.from('categories').select('*', { count: 'exact', head: true });
    const { data: salesData } = await db.from('orders').select('total_amount').eq('status', 'confirmed');

    const totalSales = salesData ? salesData.reduce((sum, order) => sum + Number(order.total_amount), 0) : 0;

    const elOrders = document.getElementById('stat-orders');
    const elProducts = document.getElementById('stat-products');
    const elSales = document.getElementById('stat-sales');
    const elCategories = document.getElementById('stat-categories');

    if (elOrders) elOrders.textContent = ordersCount || 0;
    if (elProducts) elProducts.textContent = productsCount || 0;
    if (elSales) elSales.textContent = formatPrice(totalSales);
    if (elCategories) elCategories.textContent = categoriesCount || 0;

    // Load recent 5 orders preview for Overview Tab
    loadRecentOrdersPreview();
}

async function loadRecentOrdersPreview() {
    const container = document.getElementById('recent-orders-list');
    if (!container) return;

    const { data: orders, error } = await db
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error || !orders || orders.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:16px; color:var(--text-muted);">لا توجد طلبات حديثة حتى الآن</div>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid var(--border);">
            <div>
                <div style="font-weight:700; font-size:0.9rem;">#${order.order_number} - ${order.customer_name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${new Date(order.created_at).toLocaleDateString('ar-EG')}</div>
            </div>
            <div style="text-align:left;">
                <div style="font-family:var(--font-en); font-weight:700; color:var(--gold-light); font-size:0.9rem;">${formatPrice(order.total_amount)}</div>
                <span class="status-badge status-${order.status}" style="font-size:0.7rem; padding:2px 8px;">
                    ${order.status === 'pending' ? 'قيد المراجعة ⏳' : order.status === 'confirmed' ? 'مؤكد ✅' : order.status}
                </span>
            </div>
        </div>
    `).join('');
}

// --- Orders Management & Filtering ---
async function loadOrders() {
    const tbody = document.getElementById('orders-tbody');
    const mobileList = document.getElementById('orders-mobile-list');

    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري التحميل... ⏳</td></tr>';
    if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري تحميل الطلبات... ⏳</div>';

    const { data, error } = await db
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--error);">خطأ في تحميل البيانات</td></tr>';
        if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--error);">حدث خطأ في تحميل الطلبات</div>';
        return;
    }

    allOrdersCache = data || [];
    applyOrdersFilters();
}

function handleOrdersSearch(query) {
    currentOrdersSearchQuery = (query || '').trim().toLowerCase();
    applyOrdersFilters();
}

function filterOrdersByStatus(status, chipBtn) {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    currentStatusFilter = status;
    document.querySelectorAll('.filter-chips .filter-chip').forEach(c => c.classList.remove('active'));
    if (chipBtn) chipBtn.classList.add('active');

    applyOrdersFilters();
}

function applyOrdersFilters() {
    let filtered = [...allOrdersCache];

    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(o => o.status === currentStatusFilter);
    }

    if (currentOrdersSearchQuery) {
        filtered = filtered.filter(o => 
            (o.order_number && o.order_number.toString().toLowerCase().includes(currentOrdersSearchQuery)) ||
            (o.customer_name && o.customer_name.toLowerCase().includes(currentOrdersSearchQuery)) ||
            (o.customer_phone && o.customer_phone.toLowerCase().includes(currentOrdersSearchQuery))
        );
    }

    renderOrdersView(filtered);
}

function renderOrdersView(orders) {
    const tbody = document.getElementById('orders-tbody');
    const mobileList = document.getElementById('orders-mobile-list');

    if (!orders || orders.length === 0) {
        const emptyMsg = '<div style="text-align:center; padding:32px; color:var(--text-muted);">لا توجد طلبات تظابق البحث</div>';
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px;">لا توجد طلبات مطابقة</td></tr>';
        if (mobileList) mobileList.innerHTML = emptyMsg;
        return;
    }

    // 1. Desktop Table View
    if (tbody) {
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td style="font-family:var(--font-en); font-weight:700; color:var(--gold-light);">#${order.order_number}</td>
                <td>
                    <div style="font-weight:600;">${order.customer_name}</div>
                    <a href="tel:${order.customer_phone}" style="color:var(--text-muted); font-size:0.8rem; text-decoration:underline;">📞 ${order.customer_phone}</a>
                </td>
                <td style="font-size:0.8rem; color:var(--text-secondary); max-width:180px;">${order.customer_address || '-'}</td>
                <td style="color:var(--gold-light); font-family:var(--font-en); font-weight:700;">${formatPrice(order.total_amount)}</td>
                <td style="font-family:var(--font-en); font-size:0.8rem;">${new Date(order.created_at).toLocaleDateString('ar-EG')}</td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${order.status === 'pending' ? 'قيد المراجعة ⏳' : order.status === 'confirmed' ? 'مؤكد ✅' : order.status}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;" 
                        onclick="updateOrderStatus('${order.id}', '${order.status === 'pending' ? 'confirmed' : 'pending'}')">
                        ${order.status === 'pending' ? 'تأكيد الطلب ✅' : 'إرجاع للمراجعة ⏳'}
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 2. Mobile Cards View
    if (mobileList) {
        mobileList.innerHTML = orders.map(order => `
            <div class="admin-mobile-card">
                <div class="card-header-row">
                    <div>
                        <span style="font-family:var(--font-en); font-weight:800; color:var(--gold-light); font-size:1.05rem;">#${order.order_number}</span>
                        <span style="font-size:0.75rem; color:var(--text-muted); margin-right:8px;">${new Date(order.created_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <span class="status-badge status-${order.status}">
                        ${order.status === 'pending' ? 'قيد المراجعة ⏳' : order.status === 'confirmed' ? 'مؤكد ✅' : order.status}
                    </span>
                </div>
                
                <div style="margin-bottom:8px;">
                    <div style="font-weight:700; font-size:0.95rem; color:var(--text-primary); margin-bottom:2px;">👤 ${order.customer_name}</div>
                    <div class="card-sub-text">
                        <span>📞</span>
                        <a href="tel:${order.customer_phone}" style="color:var(--gold-light); text-decoration:underline; font-weight:600;">${order.customer_phone}</a>
                    </div>
                    ${order.customer_address ? `<div class="card-sub-text"><span>📍</span> <span>${order.customer_address}</span></div>` : ''}
                    ${order.customer_notes ? `<div class="card-sub-text" style="color:var(--warning)"><span>📝</span> <span>${order.customer_notes}</span></div>` : ''}
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-elevated); padding:8px 12px; border-radius:var(--radius-md); margin-top:8px;">
                    <span style="font-size:0.85rem; color:var(--text-secondary);">الإجمالي:</span>
                    <span style="font-family:var(--font-en); font-weight:800; font-size:1.05rem; color:var(--gold-light);">${formatPrice(order.total_amount)}</span>
                </div>

                <div class="card-actions-row">
                    <button class="btn-primary" style="padding:10px; font-size:0.85rem; flex:1; background:${order.status === 'pending' ? 'var(--success)' : 'var(--bg-elevated)'}; color:${order.status === 'pending' ? '#fff' : 'var(--text-primary)'};" 
                        onclick="updateOrderStatus('${order.id}', '${order.status === 'pending' ? 'confirmed' : 'pending'}')">
                        ${order.status === 'pending' ? 'تأكيد الطلب ✅' : 'إرجاع للمراجعة ⏳'}
                    </button>
                    <a href="tel:${order.customer_phone}" class="btn-secondary" style="padding:10px; font-size:0.85rem; width:auto;">
                        📞 اتصال
                    </a>
                </div>
            </div>
        `).join('');
    }
}

async function updateOrderStatus(orderId, newStatus) {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    const { error } = await db.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
        showToast('حدث خطأ أثناء تحديث حالة الطلب', 'error');
    } else {
        showToast(newStatus === 'confirmed' ? 'تم تأكيد الطلب بنجاح 🎉' : 'تم تغيير الحالة لحالة المراجعة');
        loadOrders();
        loadDashboardStats();
    }
}

// --- Products Management & Filtering ---
async function loadCategoriesForSelect() {
    const { data } = await db.from('categories').select('*').order('sort_order', { ascending: true });
    if (data) {
        adminCategories = data;
        const select = document.getElementById('prod-category');
        if (select) {
            select.innerHTML = '<option value="">بدون قسم (منتج عام)</option>' + data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }
}

let currentProductExistingImages = [];

async function loadAdminProducts() {
    const tbody = document.getElementById('products-tbody');
    const mobileList = document.getElementById('products-mobile-list');

    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري التحميل... ⏳</td></tr>';
    if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري تحميل المنتجات... ⏳</div>';

    const { data, error } = await db.from('products').select('*, categories(name)').order('created_at', { ascending: false });
    
    if (error || !data) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--error);">تعذر جلب المنتجات</td></tr>';
        if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--error);">تعذر جلب المنتجات</div>';
        return;
    }

    allProductsCache = data;
    applyProductsFilter();
}

function handleProductsSearch(query) {
    currentProductsSearchQuery = (query || '').trim().toLowerCase();
    applyProductsFilter();
}

function applyProductsFilter() {
    let filtered = [...allProductsCache];

    if (currentProductsSearchQuery) {
        filtered = filtered.filter(p => p.name && p.name.toLowerCase().includes(currentProductsSearchQuery));
    }

    renderProductsView(filtered);
}

function renderProductsView(products) {
    const tbody = document.getElementById('products-tbody');
    const mobileList = document.getElementById('products-mobile-list');

    if (!products || products.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px;">لا توجد منتجات مطابقة</td></tr>';
        if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-muted);">لا توجد منتجات مطابقة</div>';
        return;
    }

    // 1. Desktop Table View
    if (tbody) {
        tbody.innerHTML = products.map(prod => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:12px;">
                        ${prod.image_url ? `<img src="${prod.image_url}" style="width:44px; height:44px; border-radius:var(--radius-md); object-fit:cover; border:1px solid var(--border);">` : '<div style="width:44px; height:44px; border-radius:var(--radius-md); background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">🏺</div>'}
                        <div>
                            <div style="font-weight:700;">${prod.name}</div>
                            ${prod.images && prod.images.length > 1 ? `<small style="color:var(--gold-light); font-size:0.75rem;">${prod.images.length} صور 📸</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>
                    <div style="font-family:var(--font-en); font-weight:700; color:var(--gold-light);">${formatPrice(prod.discount_price || prod.price)}</div>
                    ${prod.discount_price ? `<div style="text-decoration:line-through; font-size:0.72rem; color:var(--text-muted); font-family:var(--font-en);">${formatPrice(prod.price)}</div>` : ''}
                </td>
                <td><span style="background:var(--bg-elevated); padding:4px 10px; border-radius:var(--radius-full); font-size:0.78rem;">${prod.categories?.name || 'منتج عام'}</span></td>
                <td>${prod.is_available ? '<span style="color:var(--success); font-weight:700;">متاح ✅</span>' : '<span style="color:var(--error); font-weight:700;">غير متاح ❌</span>'}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-secondary" style="padding: 6px 12px; font-size:0.78rem;" onclick="editProduct('${prod.id}')">✏️ تعديل</button>
                        <button class="btn-secondary" style="padding: 6px 12px; font-size:0.78rem; color:var(--error); border-color:rgba(255,82,82,0.3);" onclick="deleteProduct('${prod.id}')">🗑️ حذف</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // 2. Mobile Cards View
    if (mobileList) {
        mobileList.innerHTML = products.map(prod => `
            <div class="admin-mobile-card">
                <div style="display:flex; gap:12px; align-items:center; margin-bottom:10px;">
                    ${prod.image_url ? `<img src="${prod.image_url}" style="width:60px; height:60px; border-radius:var(--radius-md); object-fit:cover; border:1px solid var(--border); flex-shrink:0;">` : '<div style="width:60px; height:60px; border-radius:var(--radius-md); background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; font-size:1.8rem; flex-shrink:0;">🏺</div>'}
                    <div style="flex:1;">
                        <div style="font-weight:700; font-size:0.95rem; margin-bottom:4px; line-height:1.3;">${prod.name}</div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-family:var(--font-en); font-weight:800; color:var(--gold-light); font-size:0.95rem;">${formatPrice(prod.discount_price || prod.price)}</span>
                            ${prod.discount_price ? `<span style="text-decoration:line-through; font-size:0.75rem; color:var(--text-muted); font-family:var(--font-en);">${formatPrice(prod.price)}</span>` : ''}
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">📁 ${prod.categories?.name || 'عام'}</div>
                    </div>
                </div>

                <div class="card-actions-row">
                    <button class="btn-secondary" style="flex:1; padding:8px 12px; font-size:0.82rem;" onclick="editProduct('${prod.id}')">✏️ تعديل المنتج</button>
                    <button class="btn-secondary" style="padding:8px 12px; font-size:0.82rem; color:var(--error); border-color:rgba(255,82,82,0.3);" onclick="deleteProduct('${prod.id}')">🗑️ حذف</button>
                </div>
            </div>
        `).join('');
    }
}

function openProductModal() {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = '';
    const urlInput = document.getElementById('prod-image-url-input');
    if (urlInput) urlInput.value = '';
    currentProductExistingImages = [];
    renderExistingImages();
    document.getElementById('modal-title').textContent = 'إضافة منتج جديد';
    document.getElementById('product-modal').classList.add('show');
}

async function editProduct(id) {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    const { data: prod, error } = await db.from('products').select('*').eq('id', id).single();
    if (error || !prod) {
        showToast('تعذر جلب بيانات المنتج', 'error');
        return;
    }

    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = prod.id;
    document.getElementById('prod-name').value = prod.name || '';
    document.getElementById('prod-price').value = prod.price || '';
    document.getElementById('prod-discount-price').value = prod.discount_price || '';
    document.getElementById('prod-category').value = prod.category_id || '';
    document.getElementById('prod-desc').value = prod.description || '';
    const urlInput = document.getElementById('prod-image-url-input');
    if (urlInput) urlInput.value = '';

    // Handle existing images flexible parsing
    if (Array.isArray(prod.images) && prod.images.length > 0) {
        currentProductExistingImages = [...prod.images];
    } else if (typeof prod.images === 'string') {
        try {
            currentProductExistingImages = JSON.parse(prod.images);
        } catch(e) {
            currentProductExistingImages = prod.image_url ? [prod.image_url] : [];
        }
    } else if (prod.image_url) {
        currentProductExistingImages = [prod.image_url];
    } else {
        currentProductExistingImages = [];
    }

    renderExistingImages();
    document.getElementById('modal-title').textContent = 'تعديل المنتج';
    document.getElementById('product-modal').classList.add('show');
}

function renderExistingImages() {
    const group = document.getElementById('existing-images-group');
    const container = document.getElementById('existing-images-container');
    if (!container || !group) return;

    if (currentProductExistingImages.length === 0) {
        group.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    group.style.display = 'block';
    container.innerHTML = currentProductExistingImages.map((url, idx) => `
        <div style="position:relative; width:65px; height:65px; border-radius:8px; overflow:hidden; border:1px solid var(--border);">
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
            <button type="button" style="position:absolute; top:2px; right:2px; background:rgba(255,82,82,0.9); color:#fff; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; cursor:pointer;" onclick="removeExistingImage(${idx})" title="حذف هذه الصورة">✕</button>
        </div>
    `).join('');
}

function removeExistingImage(idx) {
    if (typeof triggerHaptic === 'function') triggerHaptic();
    currentProductExistingImages.splice(idx, 1);
    renderExistingImages();
}

function closeModal(modalId) {
    if (typeof triggerHaptic === 'function') triggerHaptic();
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('show');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    if (typeof triggerHaptic === 'function') triggerHaptic();

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'جاري الحفظ... ⏳';

    const id = document.getElementById('prod-id').value;
    const fileInput = document.getElementById('prod-image-file');
    const directUrlInput = document.getElementById('prod-image-url-input');
    
    let newlyUploadedUrls = [];

    if (directUrlInput && directUrlInput.value.trim()) {
        newlyUploadedUrls.push(directUrlInput.value.trim());
    }

    try {
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            btn.innerHTML = `جاري رفع ${fileInput.files.length} صور... ⏳`;
            let uploadErrorsCount = 0;
            
            for (let i = 0; i < fileInput.files.length; i++) {
                const file = fileInput.files[i];
                const fileExt = file.name.split('.').pop() || 'png';
                const fileName = `${Math.random().toString(36).substring(2, 12)}_${Date.now()}.${fileExt}`;
                const filePath = `products/${fileName}`;

                try {
                    const { error: uploadError } = await db.storage
                        .from('products')
                        .upload(filePath, file, { cacheControl: '3600', upsert: true });

                    if (uploadError) {
                        console.error(`Error uploading file ${file.name}:`, uploadError);
                        uploadErrorsCount++;
                        continue;
                    }

                    const { data } = db.storage
                        .from('products')
                        .getPublicUrl(filePath);

                    if (data && data.publicUrl) {
                        newlyUploadedUrls.push(data.publicUrl);
                    }
                } catch (upErr) {
                    console.error('Upload exception:', upErr);
                    uploadErrorsCount++;
                }
            }

            if (uploadErrorsCount > 0 && newlyUploadedUrls.length === 0) {
                showToast('تعذر رفع الصور عبر السيرفر. يمكنك استخدام رابط الصورة المباشر', 'warning');
            }
        }

        const allFinalImages = [...currentProductExistingImages, ...newlyUploadedUrls];
        const primaryImageUrl = allFinalImages.length > 0 ? allFinalImages[0] : null;

        const catValue = document.getElementById('prod-category').value;
        const discountVal = document.getElementById('prod-discount-price').value;

        const productData = {
            name: document.getElementById('prod-name').value.trim(),
            price: Number(document.getElementById('prod-price').value),
            discount_price: discountVal ? Number(discountVal) : null,
            category_id: catValue ? catValue : null,
            description: document.getElementById('prod-desc').value.trim(),
            image_url: primaryImageUrl,
            images: allFinalImages,
            is_available: true
        };

        let dbError;
        if (id) {
            const res = await db.from('products').update(productData).eq('id', id);
            dbError = res.error;
        } else {
            const res = await db.from('products').insert([productData]);
            dbError = res.error;
        }

        if (dbError && (dbError.message?.includes('images') || dbError.code === 'PGRST204')) {
            console.warn('Retrying product save without images JSON column fallback...', dbError);
            delete productData.images;
            if (id) {
                const retryRes = await db.from('products').update(productData).eq('id', id);
                dbError = retryRes.error;
            } else {
                const retryRes = await db.from('products').insert([productData]);
                dbError = retryRes.error;
            }
        }

        if (dbError) throw dbError;

        showToast(id ? 'تم تعديل المنتج بنجاح 🎉' : 'تم إضافة المنتج بنجاح 🎉');
        closeModal('product-modal');
        loadAdminProducts();
        loadDashboardStats();
    } catch (err) {
        console.error('Error saving product:', err);
        showToast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteProduct(id) {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    if (confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) {
        const { error } = await db.from('products').delete().eq('id', id);
        if (!error) {
            showToast('تم حذف المنتج بنجاح');
            loadAdminProducts();
            loadDashboardStats();
        } else {
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    }
}

// --- Categories Management ---
async function loadAdminCategories() {
    const tbody = document.getElementById('categories-tbody');
    const mobileList = document.getElementById('categories-mobile-list');

    if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">جاري التحميل... ⏳</td></tr>';
    if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">جاري التحميل... ⏳</div>';

    const { data, error } = await db.from('categories').select('*').order('sort_order', { ascending: true });
    
    if (error || !data) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--error);">تعذر جلب الأقسام</td></tr>';
        if (mobileList) mobileList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--error);">تعذر جلب الأقسام</div>';
        return;
    }

    // 1. Desktop View
    if (tbody) {
        tbody.innerHTML = data.map(cat => `
            <tr>
                <td style="font-weight:700;">${cat.name}</td>
                <td style="font-size: 1.5rem;">${cat.icon || '📁'}</td>
                <td>${cat.is_active ? '<span style="color:var(--success); font-weight:700;">مفعل ✅</span>' : 'غير مفعل ❌'}</td>
                <td>
                    <button class="btn-secondary" style="padding: 6px 12px; font-size:0.78rem; color:var(--error); border-color:rgba(255,82,82,0.3);" onclick="deleteCategory('${cat.id}')">حذف</button>
                </td>
            </tr>
        `).join('');
    }

    // 2. Mobile Cards View
    if (mobileList) {
        mobileList.innerHTML = data.map(cat => `
            <div class="admin-mobile-card" style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:1.8rem;">${cat.icon || '📁'}</span>
                    <div>
                        <div style="font-weight:700; font-size:0.95rem;">${cat.name}</div>
                        <div style="font-size:0.75rem; color:var(--success);">مفعل ✅</div>
                    </div>
                </div>
                <button class="btn-secondary" style="padding: 6px 12px; font-size:0.78rem; color:var(--error); border-color:rgba(255,82,82,0.3);" onclick="deleteCategory('${cat.id}')">🗑️ حذف</button>
            </div>
        `).join('');
    }
}

function openCategoryModal() {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-modal-title').textContent = 'إضافة قسم جديد';
    document.getElementById('category-modal').classList.add('show');
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    if (typeof triggerHaptic === 'function') triggerHaptic();

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'جاري الحفظ... ⏳';

    const id = document.getElementById('cat-id').value;
    
    const catData = {
        name: document.getElementById('cat-name').value.trim(),
        icon: document.getElementById('cat-icon').value.trim(),
        is_active: true
    };

    try {
        let error;
        if (id) {
            const res = await db.from('categories').update(catData).eq('id', id);
            error = res.error;
        } else {
            const res = await db.from('categories').insert([catData]);
            error = res.error;
        }

        if (error) throw error;

        showToast('تم حفظ القسم بنجاح 🎉');
        closeModal('category-modal');
        loadAdminCategories();
        loadCategoriesForSelect();
    } catch (err) {
        console.error('Error saving category:', err);
        showToast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteCategory(id) {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    if (confirm('هل أنت متأكد من حذف هذا القسم؟ سيؤدي هذا إلى إلغاء تصنيف المنتجات التابعة له!')) {
        const { error } = await db.from('categories').delete().eq('id', id);
        if (!error) {
            showToast('تم حذف القسم بنجاح');
            loadAdminCategories();
            loadCategoriesForSelect();
        } else {
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    }
}

// Export Orders to CSV/Excel
async function exportOrdersToCSV() {
    if (typeof triggerHaptic === 'function') triggerHaptic();

    showToast('جاري تجهيز ملف المبيعات... ⏳');
    const { data: orders, error } = await db.from('orders').select('*').order('created_at', { ascending: false });
    
    if (error || !orders || orders.length === 0) {
        showToast('لا توجد طلبات لتصديرها', 'error');
        return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Arabic support
    csvContent += 'رقم الطلب,الاسم,الهاتف,العنوان,الملاحظات,الإجمالي (ج.م),الحالة,التاريخ\n';

    orders.forEach(o => {
        const date = new Date(o.created_at).toLocaleDateString('ar-EG');
        const status = o.status === 'confirmed' ? 'مؤكد' : o.status === 'pending' ? 'قيد المراجعة' : o.status;
        csvContent += `"${o.order_number}","${o.customer_name}","${o.customer_phone}","${(o.customer_address || '').replace(/"/g, '""')}","${(o.customer_notes || '').replace(/"/g, '""')}","${o.total_amount}","${status}","${date}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `طلبات_متجر_النور_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تحميل الملف بنجاح! 📊');
}

// --- Auth ---
async function logout() {
    if (typeof triggerHaptic === 'function') triggerHaptic();
    await db.auth.signOut();
    window.location.href = './login.html';
}
