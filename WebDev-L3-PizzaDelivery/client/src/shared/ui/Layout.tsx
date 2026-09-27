import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `navbar__link${isActive ? ' navbar__link--active' : ''}`;

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          <span className="navbar__brand-icon" aria-hidden="true">🍕</span>
          Ovenly
        </Link>
        <nav className="navbar__links" aria-label="Main navigation">
          <NavLink to="/menu" className={linkClass}>Menu</NavLink>
          <NavLink to="/build" className={linkClass}>Build</NavLink>
          <NavLink to="/orders" className={linkClass}>Orders</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
          {user ? (
            <>
              <span className="navbar__user hide-mobile">{user.email}</span>
              <Button variant="ghost" className="btn--small" onClick={handleLogout}>Sign out</Button>
            </>
          ) : (
            <NavLink to="/login" className={linkClass}>Account</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">Ovenly</div>
          <p className="footer__tagline">
            Build your pizza, pay in test mode, and watch it travel from kitchen to your door in real time.
          </p>
        </div>
        <div className="footer__contact">
          <div className="footer__contact-line">Support: hello@ovenly.dev</div>
          <div className="footer__contact-line">123 Pie Street, Crustville</div>
        </div>
      </div>
    </footer>
  );
}
