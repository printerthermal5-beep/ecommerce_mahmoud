// =============================================
// Wishlist Page Logic - متجر النور
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    renderWishlist();
});

function renderWishlist() {
    const grid = document.getElementById('wishlist-grid');
    if (!grid) return;

    const list = WishlistManager.getWishlist();

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">❤️</div>
                <h3>قائمة المفضلة فارغة</h3>
                <p>قم بإضافة المنتجات التي تعجبك بالضغط على أيقونة القلب في كروت المنتجات</p>
                <a href="./index.html" class="btn-secondary" style="margin-top: 16px;">تصفح المنتجات</a>
            </div>
        `;
        return;
    }

    const cart = CartManager.getCart();

    grid.innerHTML = list.map(product => {
        const hasDiscount = product.discount_price && product.discount_price < product.price;
        const discountPercent = hasDiscount
            ? Math.round((1 - product.discount_price / product.price) * 100)
            : 0;
        const displayPrice = hasDiscount ? product.discount_price : product.price;
        const cartItem = cart.find(item => item.id === product.id);
        const cartQty = cartItem ? cartItem.quantity : 0;

        return `<div class="product-card" id="wishlist-item-${product.id}">
            ${hasDiscount ? `<span class="discount-badge">-${discountPercent}%</span>` : ''}
            
            <button class="wishlist-card-btn active" onclick="removeFromWishlist('${product.id}')" title="إزالة من المفضلة">
                ❤️
            </button>

            <a href="./product.html?id=${product.id}" style="display:block;">
                ${product.image_url
                    ? `<img class="product-image" src="${product.image_url}" alt="${product.name}" loading="lazy">`
                    : `<div class="product-image-placeholder">🏺</div>`
                }
            </a>
            
            <div class="product-info">
                <a href="./product.html?id=${product.id}" class="product-name" style="text-decoration:none; color:inherit;">${product.name}</a>
                <div class="product-price-row">
                    <span class="product-price">${formatPrice(displayPrice)}</span>
                    ${hasDiscount ? `<span class="product-original-price">${formatPrice(product.price)}</span>` : ''}
                </div>
                
                <div id="card-action-${product.id}">
                    <button class="add-to-cart-btn" onclick="addWishlistItemToCart('${product.id}', this)">
                        <span>🛒</span> ${cartQty > 0 ? `في السلة (${cartQty})` : 'أضف للسلة'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function removeFromWishlist(productId) {
    const list = WishlistManager.getWishlist();
    const item = list.find(i => i.id === productId);
    if (item) {
        WishlistManager.toggle(item);
    }
    renderWishlist();
}

function addWishlistItemToCart(productId, btnElement) {
    const list = WishlistManager.getWishlist();
    const product = list.find(i => i.id === productId);
    if (!product) return;

    CartManager.addItem(product);
    showToast(`تم إضافة "${product.name}" للسلة`);
    renderWishlist();
}
