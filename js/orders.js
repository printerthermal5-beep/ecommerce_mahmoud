// =============================================
// My Orders Page Logic - الرايق لبيع الانتيكات والتحف
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    renderMyOrders();
});

function renderMyOrders() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    const orders = OrderStorageManager.getOrders();

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>لا توجد طلبات سابقة</h3>
                <p>جميع طلباتك السابقة ستظهر هنا لتتمكن من متابعة حالتها وتفاصيل المشتريات</p>
                <a href="./index.html" class="btn-secondary" style="margin-top: 16px;">البدء في التسوق</a>
            </div>
        `;
        return;
    }

    container.innerHTML = orders.map(order => {
        const orderDate = new Date(order.date).toLocaleDateString('ar-EG', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const statusClass = order.status === 'confirmed' ? 'status-confirmed' : 'status-pending';
        const statusText = order.status === 'confirmed' ? 'مؤكد ومجهز' : 'قيد المراجعة والتحضير ⏳';

        return `
            <div class="order-card animate-in">
                <div class="order-card-header">
                    <div>
                        <span class="order-number">طلب رقم #${order.order_number}</span>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${orderDate}</div>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>

                <div style="margin: 10px 0;">
                    ${order.items.map(item => `
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
                            <span>${item.quantity} × ${item.name}</span>
                            <span style="font-family:var(--font-en); font-weight:600; color:var(--text-primary);">${formatPrice(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>

                <div style="border-top:1px solid var(--border); padding-top:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.85rem; font-weight:700;">المجموع الكلي:</span>
                    <span style="font-family:var(--font-en); font-size:1rem; font-weight:700; color:var(--gold-light);">${formatPrice(order.total_amount)}</span>
                </div>
            </div>
        `;
    }).join('');
}
