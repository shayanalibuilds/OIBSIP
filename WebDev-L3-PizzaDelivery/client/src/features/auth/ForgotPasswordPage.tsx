import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiAuth, ApiError } from '../../shared/lib/api';
import { Mail, Info, CheckCircle } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const out = await apiAuth.forgotPassword({ email: email.trim().toLowerCase() });
      setMsg(out.message);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-stack">
      <div className="section-label">Auth View 4 · Forgot Password</div>
      <div className="auth-card">
        <h1 className="auth-heading">Forgot password</h1>
        <p className="auth-intro">Enter your email and we'll send a secure token to reset your password.</p>
        {err && <div className="alert alert--error"><Info size={20} /><span>{err}</span></div>}
        {msg && <div className="alert alert--success"><CheckCircle size={20} /><span>{msg}</span></div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="forgot-email" className="form-label">Email address</label>
            <input id="forgot-email" type="email" className="form-input" placeholder="elena@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ marginTop: 8, marginBottom: 20 }}>
            <span>{loading ? 'Sending…' : 'Send reset link'}</span>
            <Mail size={16} />
          </button>
          <div className="auth-links">
            <p><Link to="/login">Back to sign in</Link></p>
          </div>
        </form>
      </div>
    </main>
  );
}
