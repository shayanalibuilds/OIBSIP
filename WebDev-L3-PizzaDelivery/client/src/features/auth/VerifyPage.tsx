import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiAuth, ApiError } from '../../shared/lib/api';
import { ShieldCheck, Info } from 'lucide-react';

export function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [token, setToken] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await apiAuth.verifyEmail({ email: email.trim().toLowerCase(), token: token.trim() });
      navigate('/login');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-stack">
      <div className="section-label">Auth View 3 · Verify Email</div>
      <div className="auth-card">
        <h1 className="auth-heading">Verify your email</h1>
        <p className="auth-intro">Paste the token from your verification email. In dev with no SMTP configured, the server logs an Ethereal preview URL you can open.</p>
        {err && <div className="alert alert--error"><Info size={20} /><span>{err}</span></div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="verify-email" className="form-label">Email address</label>
            <input id="verify-email" type="email" className="form-input" value={email} readOnly style={{ background: 'var(--surface-subtle)' }} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="verify-token" className="form-label">Verification Token</label>
            <input id="verify-token" type="text" className="form-input" placeholder="e.g. 849204" required value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ marginTop: 8, marginBottom: 20 }}>
            <span>{loading ? 'Verifying…' : 'Verify'}</span>
            <ShieldCheck size={16} />
          </button>
          <div className="auth-links">
            <p><Link to="/login">Back to sign in</Link></p>
          </div>
        </form>
      </div>
    </main>
  );
}
