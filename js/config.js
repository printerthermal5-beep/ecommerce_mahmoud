// =============================================
// Supabase Configuration - متجر النور
// =============================================

const SUPABASE_URL = 'https://baprrfxmkcithsnjolgs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_egqZEvdO5jFCaEg6PTs9ow_E9YZFhMr';
const WHATSAPP_NUMBER = '2001222462607';

// Initialize Supabase Client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    },

    addItem(product) {
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
        const cart = this.getCart().filter(item => item.id !== productId);
        this.saveCart(cart);
        return cart;
    },

    updateQuantity(productId, quantity) {
        const cart = this.getCart();
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(1, quantity);
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
        localStorage.removeItem(CART_KEY);
        this.updateCartBadge();
    },

    updateCartBadge() {
        const badges = document.querySelectorAll('.cart-badge');
        const count = this.getItemCount();
        badges.forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
    }
};

// =============================================
// Toast Notification System
// =============================================
function showToast(message, type = 'success', duration = 3000) {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span class="toast-message">${message}</span>
    `;
    document.body.appendChild(toast);

    // Trigger animation
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
    // Don't show if already dismissed or installed
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
        navigator.serviceWorker.register('/sw.js')
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
