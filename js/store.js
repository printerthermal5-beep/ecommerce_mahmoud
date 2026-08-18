// =============================================
// Store Logic - الرايق لبيع الانتيكات والتحف
// =============================================

let allProducts = [];
let allCategories = [];
let activeCategory = 'all';
let userInteractedWithScroll = false;

['scroll', 'touchstart', 'mousedown', 'wheel'].forEach(evt => {
    window.addEventListener(evt, () => {
        userInteractedWithScroll = true;
    }, { passive: true, once: true });
});

document.addEventListener('DOMContentLoaded', async () => {
    CartManager.updateCartBadge();
    await loadCategories();
    await loadProducts();
    initSubtleAutoScroll();
    initPullToRefresh();
});

function initSubtleAutoScroll() {
    setTimeout(() => {
        if (!userInteractedWithScroll && window.scrollY < 20) {
            window.scrollBy({
                top: 180,
                behavior: 'smooth'
            });
        }
    }, 1600);
}

// --- Load Categories ---
async function loadCategories() {
    const { data, error } = await db
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error loading categories:', error);
        return;
    }
    allCategories = data || [];
    renderCategories();
}

function renderCategories() {
    const container = document.getElementById('categories-scroll');
    if (!container) return;

    let html = `<button class="category-chip active" onclick="filterByCategory('all')">
        <span class="cat-icon">✨</span> الكل
    </button>`;

    allCategories.forEach(cat => {
        html += `<button class="category-chip" onclick="filterByCategory('${cat.id}', this)">
            <span class="cat-icon">${cat.icon}</span> ${cat.name}
        </button>`;
    });

    container.innerHTML = html;
}

function filterByCategory(categoryId, element) {
    activeCategory = categoryId;

    // Update active chip
    document.querySelectorAll('.category-chip').forEach(chip => chip.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }

    renderProducts();
}

// --- Load Products ---
async function loadProducts() {
    showProductsSkeleton();

    const { data, error } = await db
        .from('products')
        .select('*, categories(name, icon)')
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error loading products:', error);
        document.getElementById('products-grid').innerHTML =
            '<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>حدث خطأ</h3><p>تعذر تحميل المنتجات</p></div>';
        return;
    }

    allProducts = data || [];
    renderProducts();
}

function showProductsSkeleton() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    let html = '';
    for (let i = 0; i < 6; i++) {
        html += `<div class="product-card">
            <div class="skeleton skeleton-image"></div>
            <div class="product-info">
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text-sm"></div>
            </div>
        </div>`;
    }
    grid.innerHTML = html;
}

let currentSort = 'default';

function handleSortChange(sortVal) {
    currentSort = sortVal;
    triggerHaptic();
    renderProducts();
}

function saveClickedProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (product) {
        sessionStorage.setItem('current_product_' + id, JSON.stringify(product));
    }
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let filtered = [...allProducts];
    
    // Category filter
    if (activeCategory !== 'all') {
        filtered = filtered.filter(p => p.category_id === activeCategory);
    }

    // Live search filter
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value.trim()) {
        const query = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
    }

    // Apply Sorting
    if (currentSort === 'sale') {
        filtered = filtered.filter(p => p.discount_price && p.discount_price < p.price);
    } else if (currentSort === 'price-low') {
        filtered.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
    } else if (currentSort === 'price-high') {
        filtered.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
            <div class="empty-state-icon">🔍</div>
            <h3>لا توجد نتائج تطابق بحثك</h3>
            <p>جرب تصفح قسم آخر أو تغيير كلمة البحث</p>
        </div>`;
        return;
    }

    const cart = CartManager.getCart();

    grid.innerHTML = filtered.map(product => {
        const hasDiscount = product.discount_price && product.discount_price < product.price;
        const discountPercent = hasDiscount
            ? Math.round((1 - product.discount_price / product.price) * 100)
            : 0;
        const displayPrice = hasDiscount ? product.discount_price : product.price;
        const isWishlisted = WishlistManager.isWishlisted(product.id);
        const cartItem = cart.find(item => item.id === product.id);
        const cartQty = cartItem ? cartItem.quantity : 0;

        return `<div class="product-card" id="product-${product.id}">
            ${hasDiscount ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
            
            <button class="wishlist-card-btn ${isWishlisted ? 'active' : ''}" onclick="toggleCardWishlist('${product.id}', this)" title="إضافة للمفضلة">
                ${isWishlisted ? '❤️' : '🤍'}
            </button>

            <div class="product-media">
                <a href="./product.html?id=${product.id}" onclick="saveClickedProduct('${product.id}')" style="display:block;">
                    ${product.image_url
                        ? `<img class="product-image" src="${product.image_url}" alt="${product.name}" loading="lazy">`
                        : `<div class="product-image-placeholder">🏺</div>`
                    }
                </a>
                <button class="quick-view-card-btn" onclick="openQuickView('${product.id}')" title="معاينة سريعة">
                    👁️
                </button>
            </div>
            
            <div class="product-info">
                <a href="./product.html?id=${product.id}" onclick="saveClickedProduct('${product.id}')" class="product-name" style="text-decoration:none; color:inherit;">${product.name}</a>
                <div class="product-price-row">
                    <span class="product-price">${formatPrice(displayPrice)}</span>
                    ${hasDiscount ? `<span class="product-original-price">${formatPrice(product.price)}</span>` : ''}
                </div>
                
                <div id="card-action-${product.id}">
                    ${cartQty > 0 ? `
                        <div class="card-qty-controls">
                            <button class="card-qty-btn minus" onclick="changeCardQty('${product.id}', -1)">-</button>
                            <span class="card-qty-val">${cartQty} في السلة</span>
                            <button class="card-qty-btn" onclick="changeCardQty('${product.id}', 1)">+</button>
                        </div>
                    ` : `
                        <button class="add-to-cart-btn" onclick="addToCart('${product.id}', this)">
                            <span>🛒</span> أضف للسلة
                        </button>
                    `}
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- Wishlist Toggle ---
function toggleCardWishlist(productId, btn) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const isNowWishlisted = WishlistManager.toggle(product);
    btn.innerHTML = isNowWishlisted ? '❤️' : '🤍';
    btn.classList.toggle('active', isNowWishlisted);
}

// --- Direct Quantity Controls on Cards ---
function updateCardActionUI(productId) {
    const actionEl = document.getElementById(`card-action-${productId}`);
    if (!actionEl) return;

    const cart = CartManager.getCart();
    const item = cart.find(i => i.id === productId);
    const cartQty = item ? item.quantity : 0;

    if (cartQty > 0) {
        actionEl.innerHTML = `
            <div class="card-qty-controls">
                <button class="card-qty-btn minus" onclick="changeCardQty('${productId}', -1)">-</button>
                <span class="card-qty-val">${cartQty} في السلة</span>
                <button class="card-qty-btn" onclick="changeCardQty('${productId}', 1)">+</button>
            </div>
        `;
    } else {
        actionEl.innerHTML = `
            <button class="add-to-cart-btn" onclick="addToCart('${productId}', this)">
                <span>🛒</span> أضف للسلة
            </button>
        `;
    }
}

function changeCardQty(productId, delta) {
    const cart = CartManager.getCart();
    const item = cart.find(i => i.id === productId);
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    if (!item && delta > 0) {
        CartManager.addItem(product);
    } else if (item) {
        const newQty = item.quantity + delta;
        CartManager.updateQuantity(productId, newQty);
    }
    updateCardActionUI(productId);
}

// --- Add to Cart ---
function addToCart(productId, btnElement) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    CartManager.addItem(product);
    showToast(`تم إضافة "${product.name}" للسلة`);
    updateCardActionUI(productId);
}

// --- Quick View Modal ---
function openQuickView(productId) {
    triggerHaptic();
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    let modal = document.getElementById('quick-view-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quick-view-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }

    const hasDiscount = product.discount_price && product.discount_price < product.price;
    const displayPrice = hasDiscount ? product.discount_price : product.price;
    const cartItem = CartManager.getCart().find(i => i.id === product.id);
    const cartQty = cartItem ? cartItem.quantity : 0;

    modal.innerHTML = `
        <div class="bottom-sheet">
            <button class="modal-close-btn" onclick="closeQuickView()">✕</button>
            <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px;">
                ${product.image_url 
                    ? `<img src="${product.image_url}" style="width:100px; height:100px; object-fit:cover; border-radius:var(--radius-md);">`
                    : `<div style="width:100px; height:100px; background:var(--bg-secondary); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; font-size:2.5rem;">🏺</div>`
                }
                <div>
                    <span style="font-size:0.75rem; color:var(--gold-light); font-weight:700;">${product.categories?.name || 'تحف وأنتيكات'}</span>
                    <h3 style="font-size:1.1rem; font-weight:700; margin:4px 0;">${product.name}</h3>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-family:var(--font-en); font-size:1.2rem; font-weight:700; color:var(--gold);">${formatPrice(displayPrice)}</span>
                        ${hasDiscount ? `<span style="font-family:var(--font-en); text-decoration:line-through; color:var(--text-muted); font-size:0.85rem;">${formatPrice(product.price)}</span>` : ''}
                    </div>
                </div>
            </div>
            
            <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6; margin-bottom:20px;">
                ${product.description ? product.description : 'تحفة نادرة ومميزة تضفي لمسة فخامة ديكورية على منزلك.'}
            </p>

            <div style="display:flex; gap:10px;">
                <button class="btn-primary" style="flex:1;" onclick="addToCart('${product.id}'); closeQuickView();">
                    🛒 إضافة للسلة (${cartQty > 0 ? cartQty + ' حالياً' : 'جديد'})
                </button>
                <a href="./product.html?id=${product.id}" class="btn-secondary" style="white-space:nowrap;">
                    التفاصيل الكاملة ➔
                </a>
            </div>
        </div>
    `;

    // Overlay click to close
    modal.onclick = (e) => {
        if (e.target === modal) closeQuickView();
    };

    setTimeout(() => modal.classList.add('show'), 10);
}

function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// --- Search ---
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
        renderProducts();
    }, 300));
}

// --- Pull to Refresh ---
function initPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    const threshold = 70;

    let ptrElement = document.getElementById('ptr-indicator');
    if (!ptrElement) {
        ptrElement = document.createElement('div');
        ptrElement.id = 'ptr-indicator';
        ptrElement.className = 'ptr-indicator';
        ptrElement.innerHTML = `<span class="ptr-icon">🔄</span> <span class="ptr-text">اسحب للتحديث...</span>`;
        document.body.appendChild(ptrElement);
    }

    const iconEl = ptrElement.querySelector('.ptr-icon');
    const textEl = ptrElement.querySelector('.ptr-text');

    window.addEventListener('touchstart', (e) => {
        if (window.scrollY <= 5 && !isRefreshing) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing) return;
        currentY = e.touches[0].clientY;
        const diffY = currentY - startY;

        if (diffY > 10 && window.scrollY <= 5) {
            const pullDist = Math.min(diffY * 0.45, 100);
            ptrElement.classList.add('visible');
            ptrElement.style.transform = `translateX(-50%) translateY(${pullDist - 50}px)`;
            
            const rotation = Math.min((pullDist / threshold) * 180, 180);
            if (iconEl) iconEl.style.transform = `rotate(${rotation}deg)`;

            if (pullDist >= threshold) {
                if (textEl) textEl.textContent = 'اترك للتحديث ✨';
            } else {
                if (textEl) textEl.textContent = 'اسحب للتحديث...';
            }
        }
    }, { passive: true });

    window.addEventListener('touchend', async () => {
        if (!isPulling || isRefreshing) return;
        isPulling = false;

        const diffY = currentY - startY;
        const pullDist = Math.min(diffY * 0.45, 100);

        if (pullDist >= threshold && window.scrollY <= 5) {
            isRefreshing = true;
            triggerHaptic(40);
            ptrElement.classList.add('refreshing');
            ptrElement.style.transform = 'translateX(-50%) translateY(20px)';
            if (textEl) textEl.textContent = 'جاري التحديث...';
            if (iconEl) iconEl.style.transform = 'none';

            try {
                await loadCategories();
                await loadProducts();
                showToast('تم تحديث المنتجات بنجاح ✨', 'success');
            } catch (err) {
                console.error('Refresh failed', err);
            }

            setTimeout(() => {
                ptrElement.classList.remove('visible', 'refreshing');
                ptrElement.style.transform = 'translateX(-50%) translateY(-100px)';
                if (textEl) textEl.textContent = 'اسحب للتحديث...';
                isRefreshing = false;
            }, 600);
        } else {
            ptrElement.classList.remove('visible');
            ptrElement.style.transform = 'translateX(-50%) translateY(-100px)';
        }
        startY = 0;
        currentY = 0;
    });
}
