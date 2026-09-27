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
        <Link to="/" className="navbar__brand">Ovenly</Link>
        <nav className="navbar__links" aria-label="Main navigation">
          <NavLink to="/menu" className={linkClass}>Menu</NavLink>
          <NavLink to="/build" className={linkClass}>Build</NavLink>
          <NavLink to="/orders" className={linkClass}>Orders</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
          {user ? (
            <>
              <span className="muted text-sm hide-mobile" aria-label="Signed in user">{user.email}</span>
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
          <strong>Ovenly</strong> — build your pizza, pay in test mode, watch it travel from kitchen to door.
        </div>
        <div>
          <div>Support: hello@ovenly.dev</div>
          <div>123 Pie Street, Crustville</div>
        </div>
      </div>
    </footer>
  );
}
