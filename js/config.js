// =============================================
// Supabase Configuration - متجر النور
// =============================================

const SUPABASE_URL = 'https://baprrfxmkcithsnjolgs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_egqZEvdO5jFCaEg6PTs9ow_E9YZFhMr';
const WHATSAPP_NUMBER = '2001222462607';
const FACEBOOK_URL = 'https://facebook.com'; // Facebook Page Link

// Initialize Supabase Client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to inject footer dynamically if footer element exists
function renderStoreFooter() {
    const footers = document.querySelectorAll('.store-footer');
    if (!footers || footers.length === 0) return;

    const footerHtml = `
        <div class="footer-logo">✨ متجر النور للأنتيكات ✨</div>
        <p class="footer-desc">أفخم التحف والكماليات والفازات النادرة لمنزل يفيض بالفخامة والأصالة.</p>
        <div class="footer-socials">
            <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener" class="social-btn whatsapp" onclick="triggerHaptic()">
                <span class="social-icon">💬</span> واتساب
            </a>
            <a href="${FACEBOOK_URL}" target="_blank" rel="noopener" class="social-btn facebook" onclick="triggerHaptic()">
                <span class="social-icon">📘</span> فيسبوك
            </a>
        </div>
        <div class="footer-copy">
            © 2026 متجر النور. جميع الحقوق محفوظة.
        </div>
    `;

    footers.forEach(f => f.innerHTML = footerHtml);
}

document.addEventListener('DOMContentLoaded', () => {
    renderStoreFooter();
});


// =============================================
// Cart Utilities (localStorage)
// =============================================
const CART_KEY = 'alnour_cart';

const CartManager = {
    getCart() {
        try {
            return JSON.parse(localStorage.getItem(CART_KEY)) || [];
        } catch {
            return [];
        }
    },

    saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        this.updateCartBadge();
        updateFloatingCartBar();
    },

    addItem(product) {
        triggerHaptic();
        const cart = this.getCart();
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                price: product.discount_price || product.price,
                original_price: product.price,
                image: product.image_url,
                quantity: 1
            });
        }
        this.saveCart(cart);
        return cart;
    },

    removeItem(productId) {
        triggerHaptic();
        const cart = this.getCart().filter(item => item.id !== productId);
        this.saveCart(cart);
        return cart;
    },

    updateQuantity(productId, quantity) {
        triggerHaptic();
        const cart = this.getCart();
        if (quantity <= 0) {
            return this.removeItem(productId);
        }
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity = quantity;
        }
        this.saveCart(cart);
        return cart;
    },

    getTotal() {
        return this.getCart().reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    getItemCount() {
        return this.getCart().reduce((sum, item) => sum + item.quantity, 0);
    },

    clearCart() {
        triggerHaptic();
        localStorage.removeItem(CART_KEY);
        this.updateCartBadge();
        updateFloatingCartBar();
    },

    updateCartBadge() {
        const badges = document.querySelectorAll('.cart-badge');
        const count = this.getItemCount();
        badges.forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
        updateFloatingCartBar();
    }
};

// =============================================
// Haptic Feedback Helper
// =============================================
function triggerHaptic() {
    if (navigator.vibrate) {
        try { navigator.vibrate(35); } catch(e) {}
    }
}

// =============================================
// Wishlist Utilities (localStorage)
// =============================================
const WISHLIST_KEY = 'alnour_wishlist';

const WishlistManager = {
    getWishlist() {
        try {
            return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || [];
        } catch {
            return [];
        }
    },

    toggle(product) {
        triggerHaptic();
        let list = this.getWishlist();
        const exists = list.some(item => item.id === product.id);
        if (exists) {
            list = list.filter(item => item.id !== product.id);
            showToast(`تم إزالة "${product.name}" من المفضلة`, 'info');
        } else {
            list.push({
                id: product.id,
                name: product.name,
                price: product.discount_price || product.price,
                original_price: product.price,
                image_url: product.image_url,
                discount_price: product.discount_price
            });
            showToast(`تم إضافة "${product.name}" للمفضلة ❤️`, 'success');
        }
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
        this.updateWishlistBadges();
        return !exists;
    },

    isWishlisted(productId) {
        return this.getWishlist().some(item => item.id === productId);
    },

    updateWishlistBadges() {
        const badges = document.querySelectorAll('.wishlist-badge');
        const count = this.getWishlist().length;
        badges.forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
    }
};

// =============================================
// Customer Info & Orders Utilities
// =============================================
const CustomerManager = {
    KEY: 'alnour_customer_info',
    saveInfo(info) {
        localStorage.setItem(this.KEY, JSON.stringify(info));
    },
    getInfo() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY)) || null;
        } catch {
            return null;
        }
    }
};

const OrderStorageManager = {
    KEY: 'alnour_my_orders',
    getOrders() {
        try {
            return JSON.parse(localStorage.getItem(this.KEY)) || [];
        } catch {
            return [];
        }
    },
    saveOrder(order) {
        const orders = this.getOrders();
        orders.unshift(order);
        localStorage.setItem(this.KEY, JSON.stringify(orders));
    }
};

// =============================================
// Floating Bottom Cart Bar
// =============================================
function updateFloatingCartBar() {
    let bar = document.getElementById('floating-cart-bar');
    const total = CartManager.getTotal();
    const count = CartManager.getItemCount();
    
    const pageName = window.location.pathname.split('/').pop();
    // Pages that already have their own bottom action bar (cart, checkout, product)
    const isCartOrCheckoutPage = pageName === 'cart.html' || pageName === 'checkout.html' || pageName === 'product.html';

    if (count === 0 || isCartOrCheckoutPage) {
        if (bar) bar.style.display = 'none';
        return;
    }

    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'floating-cart-bar';
        bar.className = 'floating-cart-bar';
        document.body.appendChild(bar);
    }

    bar.innerHTML = `
        <div class="floating-cart-info">
            <span class="floating-cart-icon">🛒</span>
            <div class="floating-cart-text">
                <span class="floating-cart-count">${count} منتج في السلة</span>
                <span class="floating-cart-total">${formatPrice(total)}</span>
            </div>
        </div>
        <a href="./checkout.html" class="floating-cart-btn" onclick="triggerHaptic()">
            إتمام الشراء ➔
        </a>
    `;
    bar.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    CartManager.updateCartBadge();
    WishlistManager.updateWishlistBadges();
    updateFloatingCartBar();
});

// =============================================
// Toast Notification System
// =============================================
function showToast(message, type = 'success', duration = 3000) {
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span class="toast-message">${message}</span>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// =============================================
// PWA Install Prompt
// =============================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
});

function showInstallBanner() {
    if (localStorage.getItem('pwa_dismissed') || window.matchMedia('(display-mode: standalone)').matches) {
        return;
    }

    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.classList.add('show');
    }
}

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') {
                showToast('تم تثبيت التطبيق بنجاح! 🎉');
            }
            deferredPrompt = null;
            dismissInstallBanner();
        });
    }
}

function dismissInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.classList.remove('show');
    }
    localStorage.setItem('pwa_dismissed', 'true');
}

// =============================================
// Service Worker Registration
// =============================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('SW registered'))
            .catch(err => console.log('SW registration failed:', err));
    });
}

// =============================================
// Format Currency
// =============================================
function formatPrice(price) {
    return new Intl.NumberFormat('ar-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price) + ' ج.م';
}

// =============================================
// Utility: Debounce
// =============================================
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

