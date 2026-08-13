// =============================================
// Store Logic - متجر النور
// =============================================

let allProducts = [];
let allCategories = [];
let activeCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    CartManager.updateCartBadge();
    await loadCategories();
    await loadProducts();
});

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
        html += `<button class="category-chip" onclick="filterByCategory('${cat.id}')">
            <span class="cat-icon">${cat.icon}</span> ${cat.name}
        </button>`;
    });

    container.innerHTML = html;
}

function filterByCategory(categoryId) {
    activeCategory = categoryId;

    // Update active chip
    document.querySelectorAll('.category-chip').forEach(chip => chip.classList.remove('active'));
    event.currentTarget.classList.add('active');

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

function renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let filtered = allProducts;
    if (activeCategory !== 'all') {
        filtered = allProducts.filter(p => p.category_id === activeCategory);
    }

    // Apply search filter
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value.trim()) {
        const query = searchInput.value.trim().toLowerCase();
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
            <div class="empty-state-icon">🔍</div>
            <h3>لا توجد منتجات</h3>
            <p>جرب تصنيف آخر أو كلمة بحث مختلفة</p>
        </div>`;
        return;
    }

    grid.innerHTML = filtered.map(product => {
        const hasDiscount = product.discount_price && product.discount_price < product.price;
        const discountPercent = hasDiscount
            ? Math.round((1 - product.discount_price / product.price) * 100)
            : 0;
        const displayPrice = hasDiscount ? product.discount_price : product.price;

        return `<div class="product-card" id="product-${product.id}">
            ${hasDiscount ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
            ${product.image_url
                ? `<img class="product-image" src="${product.image_url}" alt="${product.name}" loading="lazy">`
                : `<div class="product-image-placeholder">🏺</div>`
            }
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price-row">
                    <span class="product-price">${formatPrice(displayPrice)}</span>
                    ${hasDiscount ? `<span class="product-original-price">${formatPrice(product.price)}</span>` : ''}
                </div>
                <button class="add-to-cart-btn" onclick="addToCart('${product.id}', this)">
                    <span>🛒</span> أضف للسلة
                </button>
            </div>
        </div>`;
    }).join('');
}

// --- Add to Cart ---
function addToCart(productId, btnElement) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    CartManager.addItem(product);

    // Button animation
    btnElement.classList.add('added');
    btnElement.innerHTML = '<span>✓</span> تمت الإضافة';

    setTimeout(() => {
        btnElement.classList.remove('added');
        btnElement.innerHTML = '<span>🛒</span> أضف للسلة';
    }, 1500);

    showToast(`تم إضافة "${product.name}" للسلة`);
}

// --- Search ---
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
        renderProducts();
    }, 300));
}
