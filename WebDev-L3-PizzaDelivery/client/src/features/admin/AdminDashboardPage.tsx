import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
  return (
    <div className="stack">
      <div>
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="muted">Manage inventory and live orders.</p>
      </div>
      <div className="grid grid--admin">
        <Link to="/admin/inventory" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h2 className="font-semibold text-lg">Inventory</h2>
          <p className="muted text-sm mt-2">Edit stock levels, prices, low-stock thresholds.</p>
        </Link>
        <Link to="/admin/orders" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h2 className="font-semibold text-lg">Orders</h2>
          <p className="muted text-sm mt-2">View the live order board and move orders through the pipeline.</p>
        </Link>
      </div>
    </div>
  );
}
