// =============================================
// Product Details Logic - متجر النور
// =============================================

let currentProduct = null;

document.addEventListener('DOMContentLoaded', async () => {
    CartManager.updateCartBadge();
    
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        showError('لم يتم تحديد المنتج');
        return;
    }
    
    await loadProductDetails(productId);
});

async function loadProductDetails(id) {
    const { data, error } = await db
        .from('products')
        .select('*, categories(name, icon)')
        .eq('id', id)
        .single();
        
    if (error || !data) {
        console.error('Error fetching product:', error);
        showError('المنتج غير موجود أو تم حذفه');
        return;
    }
    
    currentProduct = data;
    renderProductDetails();
}

function renderProductDetails() {
    const container = document.getElementById('product-container');
    if (!container || !currentProduct) return;
    
    const p = currentProduct;
    const hasDiscount = p.discount_price && p.discount_price < p.price;
    const displayPrice = hasDiscount ? p.discount_price : p.price;
    const categoryName = p.categories ? p.categories.name : 'منتجات عامة';
    const categoryIcon = p.categories && p.categories.icon ? p.categories.icon : '✨';
    
    let html = '';
    
    // Image
    if (p.image_url) {
        html += `<img src="${p.image_url}" alt="${p.name}" class="product-hero-image animate-in">`;
    } else {
        html += `<div class="product-hero-placeholder animate-in">🏺</div>`;
    }
    
    // Meta (Title, Category, Price)
    html += `
        <div class="product-meta-container animate-in" style="animation-delay: 0.1s;">
            <div class="category-badge">
                <span>${categoryIcon}</span> ${categoryName}
            </div>
            <h1 class="product-title">${p.name}</h1>
            <div style="display:flex; align-items:center; margin-top: 8px;">
                <span class="product-price-large">${formatPrice(displayPrice)}</span>
                ${hasDiscount ? `<span class="product-price-old-large">${formatPrice(p.price)}</span>` : ''}
            </div>
        </div>
    `;
    
    // Description
    html += `
        <div class="description-box animate-in" style="animation-delay: 0.2s;">
            <h3><span>📝</span> وصف المنتج</h3>
            <p>${p.description ? p.description : 'لا يوجد وصف متاح لهذا المنتج حالياً.'}</p>
        </div>
    `;
    
    // Fixed Bottom Action Bar
    html += `
        <div class="fixed-bottom-bar animate-in" style="animation-delay: 0.3s;">
            <button class="share-btn" onclick="shareProduct()">
                🔗
            </button>
            <button class="btn-primary" onclick="addCurrentToCart(this)" ${!p.is_available ? 'disabled' : ''}>
                ${p.is_available ? '<span>🛒</span> أضف للسلة' : 'غير متوفر حالياً'}
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

function addCurrentToCart(btnElement) {
    if (!currentProduct) return;
    
    CartManager.addItem(currentProduct);
    
    const originalHtml = btnElement.innerHTML;
    btnElement.innerHTML = '<span>✓</span> تمت الإضافة';
    btnElement.style.background = 'var(--success)';
    
    showToast(`تم إضافة "${currentProduct.name}" للسلة`);
    
    setTimeout(() => {
        btnElement.innerHTML = originalHtml;
        btnElement.style.background = '';
    }, 1500);
}

function shareProduct() {
    if (!currentProduct) return;
    
    const url = window.location.href;
    const title = currentProduct.name;
    const text = `شاهد هذا المنتج الرائع من متجر النور: ${title}`;
    
    if (navigator.share) {
        navigator.share({
            title: title,
            text: text,
            url: url
        }).catch(err => {
            console.log('Error sharing:', err);
            copyToClipboard(url);
        });
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم نسخ رابط المنتج!', 'success');
    }).catch(() => {
        showToast('فشل نسخ الرابط', 'error');
    });
}

function showError(msg) {
    const container = document.getElementById('product-container');
    if(container) {
        container.innerHTML = `
            <div class="empty-state animate-in" style="padding-top: 100px;">
                <div class="empty-state-icon">⚠️</div>
                <h3>${msg}</h3>
                <a href="./index.html" class="btn-secondary" style="margin-top: 20px;">العودة للرئيسية</a>
            </div>
        `;
    }
}
