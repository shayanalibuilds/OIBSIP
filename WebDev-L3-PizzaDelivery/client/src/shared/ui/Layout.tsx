import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShoppingBag, User, LogOut, LayoutDashboard } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? ' active' : ''}`;

  return (
    <header className="navbar" role="banner">
      <div className="nav-container">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/" className="brand" aria-label="Ovenly Home">
            Ovenly<span className="brand-dot"></span>
          </Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="admin-link">
              <LayoutDashboard size={16} />
              <span>Admin</span>
            </Link>
          )}
        </div>
        <nav className="nav-links" aria-label="Primary navigation">
          <NavLink to="/menu" className={linkClass}>Menu</NavLink>
          <NavLink to="/build" className={linkClass}>Build Custom Pie</NavLink>
          <NavLink to="/orders" className={linkClass}>Your Orders</NavLink>
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">{user.email}</span>
              <button className="btn-signout" onClick={handleLogout}>
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link">
              <User size={16} />
              <span>Account</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-col">
          <div className="footer-brand">Ovenly<span style={{ color: 'var(--accent)' }}>.</span></div>
          <p className="footer-tagline">
            Artisanal wood-fired sourdough pizzas crafted to order with locally sourced farm ingredients and direct-to-door temperature preservation.
          </p>
        </div>
        <div className="footer-col">
          <h4>Navigation</h4>
          <ul>
            <li><Link to="/build" className="footer-link">Custom Pizza Builder</Link></li>
            <li><Link to="/menu" className="footer-link">Full Menu &amp; Ingredients</Link></li>
            <li><Link to="/orders" className="footer-link">Order Tracker</Link></li>
            <li><Link to="/admin" className="footer-link">Admin Portal</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Oven Hours</h4>
          <ul>
            <li><strong>Mon – Thu:</strong> 11:30 AM – 10:00 PM</li>
            <li><strong>Fri – Sun:</strong> 11:30 AM – 11:00 PM</li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Direct Contact</h4>
          <ul>
            <li>hello@ovenly.dev</li>
            <li>123 Pie Street, Crustville</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2026 Ovenly Pizza Co. All rights reserved. Artisan wood-fired culinary experience.</div>
      </div>
    </footer>
  );
}
