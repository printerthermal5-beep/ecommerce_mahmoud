// =============================================
// Admin Logic - متجر النور
// =============================================

let adminCategories = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        window.location.href = './login.html';
        return;
    }

    loadDashboardStats();
    loadCategoriesForSelect();
    
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);
    
    const catForm = document.getElementById('category-form');
    if(catForm) catForm.addEventListener('submit', handleCategorySubmit);
});

// --- Tab Switching ---
function switchTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';

    if (tabId === 'orders') loadOrders();
    if (tabId === 'products') loadAdminProducts();
    if (tabId === 'categories') loadAdminCategories();
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
        select.innerHTML = '<option value="">بدون قسم (منتج عام)</option>' + data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
}

let currentProductExistingImages = [];

async function loadAdminProducts() {
    const tbody = document.getElementById('products-tbody');
    const { data } = await db.from('products').select('*, categories(name)').order('created_at', { ascending: false });
    
    if (!data) return;

    tbody.innerHTML = data.map(prod => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:12px;">
                    ${prod.image_url ? `<img src="${prod.image_url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">` : '🏺'}
                    <div>
                        <div style="font-weight:600;">${prod.name}</div>
                        ${prod.images && prod.images.length > 1 ? `<small style="color:var(--gold-light);">${prod.images.length} صور 📸</small>` : ''}
                    </div>
                </div>
            </td>
            <td style="font-family:var(--font-en);">${formatPrice(prod.price)}</td>
            <td>${prod.categories?.name || '-'}</td>
            <td>${prod.is_available ? '✅' : '❌'}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn-secondary" style="padding: 4px 10px; font-size:0.8rem;" onclick="editProduct('${prod.id}')">✏️ تعديل</button>
                    <button class="btn-secondary" style="padding: 4px 10px; font-size:0.8rem; color:var(--error); border-color:rgba(255,82,82,0.3);" onclick="deleteProduct('${prod.id}')">🗑️ حذف</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openProductModal() {
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
        <div style="position:relative; width:65px; height:65px; border-radius:6px; overflow:hidden; border:1px solid var(--border);">
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
            <button type="button" style="position:absolute; top:2px; right:2px; background:rgba(255,82,82,0.9); color:#fff; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.65rem;" onclick="removeExistingImage(${idx})" title="حذف هذه الصورة">✕</button>
        </div>
    `).join('');
}

function removeExistingImage(idx) {
    currentProductExistingImages.splice(idx, 1);
    renderExistingImages();
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
    const directUrlInput = document.getElementById('prod-image-url-input');
    
    let newlyUploadedUrls = [];

    // Direct URL if entered
    if (directUrlInput && directUrlInput.value.trim()) {
        newlyUploadedUrls.push(directUrlInput.value.trim());
    }

    try {
        // Upload multiple selected files if any
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

        // Combine kept existing images + newly uploaded images
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

        // Fallback: If DB schema doesn't have 'images' column yet, retry without 'images' field
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
            if (!dbError) {
                showToast('تم حفظ الصورة الرئيسية. يرجى تنفيذ كود SQL المكتوب لتفعيل الصور المتعددة', 'warning', 6000);
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

// Export Orders to CSV/Excel
async function exportOrdersToCSV() {
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

async function deleteProduct(id) {
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
    const { data } = await db.from('categories').select('*').order('sort_order', { ascending: true });
    
    if(!data) return;

    tbody.innerHTML = data.map(cat => `
        <tr>
            <td>${cat.name}</td>
            <td style="font-size: 1.5rem;">${cat.icon || '📁'}</td>
            <td>${cat.is_active ? '✅' : '❌'}</td>
            <td>
                <button class="btn-secondary" style="padding: 4px 8px;" onclick="deleteCategory('${cat.id}')">حذف</button>
            </td>
        </tr>
    `).join('');
}

function openCategoryModal() {
    document.getElementById('category-form').reset();
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-modal-title').textContent = 'إضافة قسم جديد';
    document.getElementById('category-modal').classList.add('show');
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'جاري الحفظ... ⏳';

    const id = document.getElementById('cat-id').value;
    
    const catData = {
        name: document.getElementById('cat-name').value,
        icon: document.getElementById('cat-icon').value,
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

        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }

        showToast('تم الحفظ بنجاح');
        closeModal('category-modal');
        loadAdminCategories();
        loadCategoriesForSelect(); // refresh dropdowns
    } catch (err) {
        console.error('Error saving category:', err);
        showToast(err.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteCategory(id) {
    if(confirm('هل أنت متأكد من حذف هذا القسم؟ سيؤدي هذا إلى إلغاء تصنيف المنتجات التابعة له!')) {
        const { error } = await db.from('categories').delete().eq('id', id);
        if(!error) {
            showToast('تم الحذف');
            loadAdminCategories();
            loadCategoriesForSelect();
        } else {
            showToast('حدث خطأ أثناء الحذف', 'error');
        }
    }
}

// --- Auth ---
async function logout() {
    await db.auth.signOut();
    window.location.href = './login.html';
}
