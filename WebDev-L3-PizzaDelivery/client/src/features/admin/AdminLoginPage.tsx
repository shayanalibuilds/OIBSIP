import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { ArrowRight, Info } from 'lucide-react';
import { ApiError } from '../../shared/lib/api';

export function AdminLoginPage() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@ovenly.dev');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await adminLogin(email.trim().toLowerCase(), password);
      navigate('/admin');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Admin login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-stack">
      <div className="section-label">Section 1 · Admin Sign In</div>
      <div style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <div className="auth-card">
          <h1 className="auth-heading">Admin sign in</h1>
          <p className="auth-intro">Manage inventory and the live order board.</p>
          {err && <div className="alert alert--error"><Info size={20} /><span>{err}</span></div>}
          <form onSubmit={onSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="admin-email" className="form-label">Email address</label>
              <input id="admin-email" type="email" className="form-input" value={email} required autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="admin-password" className="form-label">Password</label>
              <input id="admin-password" type="password" className="form-input" placeholder="••••••••" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ marginTop: 8, marginBottom: 16 }}>
              <span>{loading ? 'Signing in…' : 'Sign in'}</span>
              <ArrowRight size={16} />
            </button>
            <div className="auth-links">
              <p><Link to="/login">Customer sign in</Link></p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
