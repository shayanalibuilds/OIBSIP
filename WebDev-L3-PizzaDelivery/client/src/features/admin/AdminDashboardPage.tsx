import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  return (
    <div className="stack--lg">
      <div className="section-header">
        <h1>Admin dashboard</h1>
        <p>Manage inventory and live orders.</p>
      </div>
      <div className="grid grid--2">
        <Link to="/admin/inventory" className="admin-card">
          <div className="admin-card__icon" aria-hidden="true">📦</div>
          <div className="admin-card__title">Inventory</div>
          <div className="admin-card__desc">Edit stock levels, prices, and low-stock thresholds.</div>
        </Link>
        <Link to="/admin/orders" className="admin-card">
          <div className="admin-card__icon" aria-hidden="true">📋</div>
          <div className="admin-card__title">Orders</div>
          <div className="admin-card__desc">View the live order board and move orders through the pipeline.</div>
        </Link>
      </div>
    </div>
  );
}
