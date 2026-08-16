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
    // 1. Instant rendering from session cache if user clicked from store
    const cached = sessionStorage.getItem('current_product_' + id);
    if (cached) {
        try {
            currentProduct = JSON.parse(cached);
            renderProductDetails();
            loadRelatedProducts(currentProduct.category_id, currentProduct.id); // Non-blocking
        } catch (e) {
            console.error('Error parsing cached product:', e);
        }
    }

    // 2. Fetch fresh details from Supabase in background
    const { data, error } = await db
        .from('products')
        .select('*, categories(name, icon)')
        .eq('id', id)
        .single();
        
    if (!error && data) {
        currentProduct = data;
        renderProductDetails();
        loadRelatedProducts(data.category_id, data.id); // Non-blocking background fetch
    } else if (!currentProduct) {
        console.error('Error fetching product:', error);
        showError('المنتج غير موجود أو تم حذفه');
    }
}

function renderProductDetails() {
    const container = document.getElementById('product-container');
    if (!container || !currentProduct) return;
    
    const p = currentProduct;
    const hasDiscount = p.discount_price && p.discount_price < p.price;
    const displayPrice = hasDiscount ? p.discount_price : p.price;
    const categoryName = p.categories ? p.categories.name : 'منتجات عامة';
    const categoryIcon = p.categories && p.categories.icon ? p.categories.icon : '✨';
    const isWishlisted = WishlistManager.isWishlisted(p.id);

    let html = '';
    
    let imagesList = [];
    if (Array.isArray(p.images) && p.images.length > 0) {
        imagesList = p.images;
    } else if (p.image_url) {
        imagesList = [p.image_url];
    }
    
    // Hero Image & Gallery
    if (imagesList.length > 0) {
        const primaryImage = imagesList[0];
        html += `
            <div style="position:relative;">
                <img id="main-product-img" src="${primaryImage}" alt="${p.name}" class="product-hero-image animate-in" onclick="openLightbox(this.src)" title="انقر لتكبير الصورة 🔍">
                <span style="position:absolute; bottom:12px; left:12px; background:rgba(0,0,0,0.6); padding:4px 10px; border-radius:var(--radius-full); font-size:0.75rem; color:#fff; backdrop-filter:blur(4px);">🔍 انقر للتكبير</span>
            </div>
        `;

        if (imagesList.length > 1) {
            html += `
                <div class="product-gallery-thumbnails animate-in" style="display:flex; gap:10px; overflow-x:auto; padding:12px 16px; background:var(--bg-secondary); border-bottom:1px solid var(--border);">
                    ${imagesList.map((imgUrl, idx) => `
                        <img src="${imgUrl}" class="gallery-thumb ${idx === 0 ? 'active' : ''}" style="width:65px; height:65px; object-fit:cover; border-radius:var(--radius-md); border:2px solid ${idx === 0 ? 'var(--gold)' : 'transparent'}; cursor:pointer; flex-shrink:0; transition:var(--transition);" onclick="changeMainImage('${imgUrl}', this)">
                    `).join('')}
                </div>
            `;
        }
    } else {
        html += `<div class="product-hero-placeholder animate-in">🏺</div>`;
    }
    
    // Meta (Title, Category, Price, Wishlist)
    html += `
        <div class="product-meta-container animate-in" style="animation-delay: 0.1s;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="category-badge">
                    <span>${categoryIcon}</span> ${categoryName}
                </div>
                <button class="wishlist-card-btn ${isWishlisted ? 'active' : ''}" style="position:static;" onclick="toggleDetailsWishlist('${p.id}', this)">
                    ${isWishlisted ? '❤️' : '🤍'}
                </button>
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
            <p>${p.description ? p.description : 'تحفة عريقة ومصنوعة بإتقان لتكون قطعة ديكور مبهرة تتناسب مع كافة الأذواق.'}</p>
        </div>
    `;

    // Related Products placeholder
    html += `
        <section class="animate-in" style="animation-delay: 0.25s; margin-top: 20px;">
            <h3 class="section-title">تحف قد تعجبك أيضاً</h3>
            <div id="related-products-container" class="related-products-scroll">
                <div style="padding: 10px; color: var(--text-muted); font-size:0.8rem;">جاري تحميل اقتراحات ذات صلة...</div>
            </div>
        </section>
    `;
    
    // Fixed Bottom Action Bar
    html += `
        <div class="fixed-bottom-bar animate-in" style="animation-delay: 0.3s;">
            <button class="share-btn" onclick="shareProduct()" title="مشاركة الرابط">
                🔗
            </button>
            <button class="btn-primary" onclick="addCurrentToCart(this)" ${!p.is_available ? 'disabled' : ''}>
                ${p.is_available ? '<span>🛒</span> أضف للسلة' : 'غير متوفر حالياً'}
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// --- Load Related Products ---
async function loadRelatedProducts(categoryId, currentId) {
    const container = document.getElementById('related-products-container');
    if (!container) return;

    let query = db.from('products').select('*').eq('is_available', true).neq('id', currentId);
    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    const { data } = await query.limit(6);
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div style="padding:10px; color:var(--text-muted); font-size:0.8rem;">لا توجد منتجات أخرى من نفس القسم حالياً.</div>';
        return;
    }

    container.innerHTML = data.map(prod => `
        <a href="./product.html?id=${prod.id}" class="related-product-card">
            ${prod.image_url ? `<img src="${prod.image_url}" alt="${prod.name}">` : '<div style="height:100px; background:var(--bg-secondary); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:2rem;">🏺</div>'}
            <div class="related-product-name">${prod.name}</div>
            <div class="related-product-price">${formatPrice(prod.discount_price || prod.price)}</div>
        </a>
    `).join('');
}

function changeMainImage(imgUrl, thumbEl) {
    const mainImg = document.getElementById('main-product-img');
    if (mainImg) {
        mainImg.src = imgUrl;
    }
    document.querySelectorAll('.gallery-thumb').forEach(t => t.style.borderColor = 'transparent');
    if (thumbEl) {
        thumbEl.style.borderColor = 'var(--gold)';
    }
    triggerHaptic();
}

// --- Wishlist Toggle ---
function toggleDetailsWishlist(productId, btn) {
    if (!currentProduct) return;
    const isWishlisted = WishlistManager.toggle(currentProduct);
    btn.innerHTML = isWishlisted ? '❤️' : '🤍';
    btn.classList.toggle('active', isWishlisted);
}

// --- Image Lightbox / Zoom ---
function openLightbox(imageUrl) {
    triggerHaptic();
    let modal = document.getElementById('lightbox-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lightbox-modal';
        modal.className = 'modal-overlay';
        modal.style.alignItems = 'center';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <button class="modal-close-btn" style="top:20px; right:20px; left:auto;" onclick="closeLightbox()">✕</button>
        <div class="lightbox-content">
            <img src="${imageUrl}" class="lightbox-img" id="lightbox-img-el" onclick="this.classList.toggle('zoomed')">
            <p style="color:var(--text-secondary); font-size:0.78rem; margin-top:12px;">انقر للتكبير / التصغير 🔍</p>
        </div>
    `;

    modal.onclick = (e) => {
        if (e.target === modal) closeLightbox();
    };

    setTimeout(() => modal.classList.add('show'), 10);
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.classList.remove('show');
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

