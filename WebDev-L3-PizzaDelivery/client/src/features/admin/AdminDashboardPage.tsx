import { Link } from 'react-router-dom';
import { Boxes, ClipboardList, ArrowRight } from 'lucide-react';

export function AdminDashboardPage() {
  return (
    <main className="admin-stack">
      <div className="section-label">Section 2 · Admin Dashboard</div>
      <header style={{ marginBottom: 32 }}>
        <h1 className="page-title">Admin dashboard</h1>
        <p className="page-subtitle">Manage inventory and live orders.</p>
      </header>
      <div className="portal-grid">
        <Link to="/admin/inventory" className="portal-card">
          <div className="portal-card-top">
            <div className="icon-box"><Boxes size={24} /></div>
            <div>
              <h3>Inventory</h3>
              <p>Edit stock levels, prices, low-stock thresholds.</p>
            </div>
          </div>
          <div className="portal-action">
            <span>Manage catalog</span>
            <ArrowRight size={16} />
          </div>
        </Link>
        <Link to="/admin/orders" className="portal-card">
          <div className="portal-card-top">
            <div className="icon-box"><ClipboardList size={24} /></div>
            <div>
              <h3>Orders</h3>
              <p>View the live order board and move orders through the pipeline.</p>
            </div>
          </div>
          <div className="portal-action">
            <span>Open order board</span>
            <ArrowRight size={16} />
          </div>
        </Link>
      </div>
    </main>
  );
}
