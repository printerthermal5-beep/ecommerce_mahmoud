// =============================================
// Product Details Logic - متجر النور
// =============================================

let currentProduct = null;
let currentProductImages = [];
let currentImageIndex = 0;

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
        injectProductSchema(data);
        loadRelatedProducts(data.category_id, data.id); // Non-blocking background fetch
    } else if (!currentProduct) {
        console.error('Error fetching product:', error);
        showError('المنتج غير موجود أو تم حذفه');
    }
}

function injectProductSchema(p) {
    if (!p) return;
    document.title = `${p.name} | الرايق لبيع الانتيكات والتحف`;
    let script = document.getElementById('product-jsonld');
    if (!script) {
        script = document.createElement('script');
        script.id = 'product-jsonld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": p.name,
        "image": p.images && p.images.length ? p.images : (p.image_url ? [p.image_url] : []),
        "description": p.description || p.name,
        "brand": {
            "@type": "Brand",
            "name": "الرايق لبيع الانتيكات والتحف"
        },
        "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "EGP",
            "price": p.discount_price || p.price,
            "availability": p.is_available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
    };
    script.textContent = JSON.stringify(schema);
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
    currentProductImages = imagesList;
    currentImageIndex = 0;
    
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

    // Reviews
    html += `
        <div class="reviews-section animate-in" style="animation-delay: 0.22s; margin: 24px 16px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg);">
            <h3 style="font-size: 1.1rem; margin-bottom: 16px; color: var(--gold-light);"><span>⭐</span> آراء عملائنا</h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
                <div style="padding:10px; border:1px solid rgba(255,255,255,0.05); border-radius:8px; background:var(--bg-elevated);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-size:0.85rem; font-weight:700;">أحمد محمود</span>
                        <span style="color:var(--gold); font-size:0.75rem;">⭐⭐⭐⭐⭐</span>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-secondary);">التحفة وصلتني بتغليف ممتاز وشكلها على الطبيعة أفخم بكثير من الصور، شكراً متجر الرايق.</p>
                </div>
                <div style="padding:10px; border:1px solid rgba(255,255,255,0.05); border-radius:8px; background:var(--bg-elevated);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span style="font-size:0.85rem; font-weight:700;">منى السيد</span>
                        <span style="color:var(--gold); font-size:0.75rem;">⭐⭐⭐⭐⭐</span>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-secondary);">سرعة في التوصيل وتعامل راقي جداً، القطعة أضافت لمسة جميلة جداً لصالون بيتي.</p>
                </div>
            </div>
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
        <div class="fixed-bottom-bar animate-in" style="animation-delay: 0.3s; padding:10px 16px; align-items:center;" id="product-bottom-action">
            <!-- Rendered by renderProductBottomAction() -->
        </div>
    `;
    
    container.innerHTML = html;
    injectProductSchema(p);
    updateFloatingWhatsappBtn(p);
    renderProductBottomAction();
    setupImageSwipe();
}

function updateFloatingWhatsappBtn(p) {
    const btn = document.querySelector('.floating-whatsapp-btn');
    if (!btn || !p) return;
    const priceText = formatPrice(p.discount_price || p.price);
    const msg = `مرحباً متجر الرايق، أريد الاستفسار عن المنتج:\n📌 *${p.name}*\n💰 السعر: ${priceText}\n🔗 الرابط: ${window.location.href}`;
    btn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

// --- Dynamic Canonical, Open Graph & Google Rich Snippets Schema ---
function injectProductSchema(p) {
    const productUrl = `https://elrayek.qd.je/product.html?id=${p.id}`;
    const productTitle = `${p.name} | الرايق لبيع الانتيكات والتحف`;
    const productDesc = p.description
        ? p.description.replace(/[\r\n]+/g, ' ').substring(0, 160)
        : 'تحفة عريقة ومصنوعة بإتقان من متجر الرايق لبيع الانتيكات والتحف.';
    const productImage = p.image_url || 'https://elrayek.qd.je/assets/icons/icon-512.png';

    // 1. Dynamic Canonical URL
    let canonicalLink = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = productUrl;

    // 2. Dynamic Open Graph Meta Tags
    setMetaTag('property', 'og:title', productTitle);
    setMetaTag('property', 'og:description', productDesc);
    setMetaTag('property', 'og:image', productImage);
    setMetaTag('property', 'og:url', productUrl);
    setMetaTag('name', 'twitter:title', productTitle);
    setMetaTag('name', 'twitter:description', productDesc);
    setMetaTag('name', 'twitter:image', productImage);

    // 3. Dynamic JSON-LD Schema (Product + BreadcrumbList)
    let scriptEl = document.getElementById('product-json-ld');
    if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'product-json-ld';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
    }
    
    const schemaGraph = [
        {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": p.name,
            "image": p.image_url ? [p.image_url] : [productImage],
            "description": productDesc,
            "sku": p.id,
            "brand": {
                "@type": "Brand",
                "name": "الرايق"
            },
            "offers": {
                "@type": "Offer",
                "url": productUrl,
                "priceCurrency": "EGP",
                "price": p.discount_price || p.price,
                "priceValidUntil": "2027-12-31",
                "availability": p.is_available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition",
                "seller": {
                    "@type": "Organization",
                    "name": "الرايق لبيع الانتيكات والتحف",
                    "url": "https://elrayek.qd.je/"
                }
            }
        },
        {
            "@context": "https://schema.org/",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "الرئيسية",
                    "item": "https://elrayek.qd.je/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "الأنتيكات والتحف",
                    "item": "https://elrayek.qd.je/index.html"
                },
                {
                    "@type": "ListItem",
                    "position": 3,
                    "name": p.name,
                    "item": productUrl
                }
            ]
        }
    ];

    scriptEl.textContent = JSON.stringify(schemaGraph);
}

function setMetaTag(attribute, key, value) {
    let tag = document.querySelector(`meta[${attribute}='${key}']`);
    if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
    }
    tag.setAttribute('content', value);
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
let isLightboxOpen = false;

function openLightbox(imageUrl) {
    triggerHaptic();
    let modal = document.getElementById('lightbox-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'lightbox-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <button class="modal-close-btn" onclick="closeLightbox(event)" title="إغلاق">✕</button>
        <div class="lightbox-content" onclick="event.stopPropagation()">
            <img src="${imageUrl}" class="lightbox-img" id="lightbox-img-el" onclick="this.classList.toggle('zoomed')">
            <p style="color:rgba(255,255,255,0.7); font-size:0.78rem; margin-top:12px;">انقر للتقريب / التصغير 🔍</p>
            <button onclick="closeLightbox(event)" style="margin-top:16px; padding:8px 20px; border-radius:var(--radius-full); background:rgba(255,255,255,0.2); color:#fff; font-size:0.85rem; border:1px solid rgba(255,255,255,0.3);">إغلاق المعاينة ✕</button>
        </div>
    `;

    modal.onclick = () => closeLightbox();

    setTimeout(() => modal.classList.add('show'), 10);
    isLightboxOpen = true;

    // Listen for Escape key
    window.addEventListener('keydown', handleLightboxKeydown);
}

function handleLightboxKeydown(e) {
    if (e.key === 'Escape' && isLightboxOpen) {
        closeLightbox();
    }
}

function closeLightbox(e) {
    if (e) e.stopPropagation();
    const modal = document.getElementById('lightbox-modal');
    if (modal) {
        modal.classList.remove('show');
    }
    isLightboxOpen = false;
    window.removeEventListener('keydown', handleLightboxKeydown);
}

function addCurrentToCart(btnElement) {
    if (!currentProduct) return;
    CartManager.addItem(currentProduct);
    showToast(`تم إضافة "${currentProduct.name}" للسلة`);
    renderProductBottomAction();
}

function renderProductBottomAction() {
    const actionContainer = document.getElementById('product-bottom-action');
    if(!actionContainer || !currentProduct) return;
    
    if(!currentProduct.is_available) {
        actionContainer.innerHTML = `<button class="btn-primary" disabled>غير متوفر حالياً</button>`;
        return;
    }
    
    const cart = CartManager.getCart();
    const item = cart.find(i => i.id === currentProduct.id);
    const cartQty = item ? item.quantity : 0;
    
    if(cartQty > 0) {
        actionContainer.innerHTML = `
            <div class="card-qty-controls" style="flex:1; height:48px; background:var(--bg-card); border-color:var(--gold);">
                <button class="card-qty-btn minus" style="width:40px;height:40px;" onclick="changeProductPageQty(-1)">-</button>
                <span class="card-qty-val" style="font-size:1.1rem;">${cartQty} في السلة</span>
                <button class="card-qty-btn" style="width:40px;height:40px;" onclick="changeProductPageQty(1)">+</button>
            </div>
        `;
    } else {
        actionContainer.innerHTML = `
            <button class="btn-primary" onclick="addCurrentToCart(this)">
                <span>🛒</span> أضف للسلة
            </button>
        `;
    }
}

function changeProductPageQty(delta) {
    if(!currentProduct) return;
    const cart = CartManager.getCart();
    const item = cart.find(i => i.id === currentProduct.id);
    
    if(!item && delta > 0) {
        CartManager.addItem(currentProduct);
    } else if (item) {
        const newQty = item.quantity + delta;
        CartManager.updateQuantity(currentProduct.id, newQty);
    }
    renderProductBottomAction();
}

function setupImageSwipe() {
    const mainImg = document.getElementById('main-product-img');
    if(!mainImg || currentProductImages.length <= 1) return;
    
    let touchstartX = 0;
    let touchendX = 0;

    mainImg.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
    }, {passive:true});

    mainImg.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive:true});
    
    function handleSwipe() {
        const diff = touchstartX - touchendX;
        if (Math.abs(diff) > 50) { 
            if (diff > 0) {
                // Swipe Left -> Next Image
                currentImageIndex = (currentImageIndex + 1) % currentProductImages.length;
            } else {
                // Swipe Right -> Prev Image
                currentImageIndex = (currentImageIndex - 1 + currentProductImages.length) % currentProductImages.length;
            }
            const thumbs = document.querySelectorAll('.gallery-thumb');
            changeMainImage(currentProductImages[currentImageIndex], thumbs[currentImageIndex]);
        }
    }
}

function goBack() {
    if (document.referrer && document.referrer.includes(window.location.host)) {
        history.back();
    } else {
        window.location.href = './index.html';
    }
}

function shareProduct() {
    if (!currentProduct) return;
    
    const url = window.location.href;
    const title = currentProduct.name;
    const text = `شاهد هذه التحفة الرائعة من متجر الرايق لبيع الانتيكات والتحف: ${title}`;
    
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

