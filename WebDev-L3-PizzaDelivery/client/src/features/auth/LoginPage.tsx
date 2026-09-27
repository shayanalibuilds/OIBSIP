import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { ArrowRight, Info } from 'lucide-react';
import { ApiError } from '../../shared/lib/api';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const user = await login(email.trim().toLowerCase(), password);
      const next = params.get('next');
      navigate(next ?? (user.role === 'admin' ? '/admin' : '/menu'));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-stack">
      <div className="section-label">Auth View 1 · Sign In</div>
      <div className="auth-card">
        <h1 className="auth-heading">Sign in</h1>
        <p className="auth-intro">Access your Ovenly account and track live pizza deliveries.</p>
        {err && <div className="alert alert--error"><Info size={20} /><span>{err}</span></div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email" className="form-label">Email address</label>
            <input id="login-email" type="email" className="form-input" placeholder="you@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="login-password" className="form-label">Password</label>
            <input id="login-password" type="password" className="form-input" placeholder="••••••••" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ marginTop: 8, marginBottom: 20 }}>
            <span>{loading ? 'Signing in…' : 'Sign in'}</span>
            <ArrowRight size={16} />
          </button>
          <div className="auth-links">
            <p>New here? <Link to="/register">Create an account</Link></p>
            <p><Link to="/forgot">Forgot password? Reset it</Link></p>
          </div>
        </form>
      </div>
    </main>
  );
}
