import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiAuth, ApiError } from '../../shared/lib/api';
import { Key, Info } from 'lucide-react';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [token, setToken] = useState(params.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    const newErrs: Record<string, string> = {};
    if (!email.trim()) newErrs.email = 'Email is required';
    if (!token.trim()) newErrs.token = 'Token is required';
    if (password.length < 8) newErrs.password = 'At least 8 characters';
    else if (!/[0-9]/.test(password)) newErrs.password = 'Must contain a number';
    setErrs(newErrs);
    if (Object.keys(newErrs).length > 0) return;

    setLoading(true);
    try {
      await apiAuth.resetPassword({ email: email.trim().toLowerCase(), token: token.trim(), password });
      navigate('/login');
    } catch (e) {
      setFormErr(e instanceof ApiError ? e.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-stack">
      <div className="section-label">Auth View 5 · Reset Password</div>
      <div className="auth-card">
        <h1 className="auth-heading">Reset password</h1>
        <p className="auth-intro">Create a new secure password for your account.</p>
        {formErr && <div className="alert alert--error"><Info size={20} /><span>{formErr}</span></div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reset-email" className="form-label">Email address</label>
            <input id="reset-email" type="email" className={`form-input${errs.email ? ' error' : ''}`} placeholder="elena@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errs.email && <p className="form-field__error">{errs.email}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="reset-token" className="form-label">Token</label>
            <input id="reset-token" type="text" className={`form-input${errs.token ? ' error' : ''}`} placeholder="Security token from email" required value={token} onChange={(e) => setToken(e.target.value)} />
            {errs.token && <p className="form-field__error">{errs.token}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="reset-new-password" className="form-label">New Password</label>
            <input id="reset-new-password" type="password" className={`form-input${errs.password ? ' error' : ''}`} placeholder="••••••••" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="input-hint">At least 8 characters and one number</p>
            {errs.password && <p className="form-field__error">{errs.password}</p>}
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ marginTop: 8, marginBottom: 20 }}>
            <span>{loading ? 'Updating…' : 'Update password'}</span>
            <Key size={16} />
          </button>
          <div className="auth-links">
            <p><Link to="/login">Back to sign in</Link></p>
          </div>
        </form>
      </div>
    </main>
  );
}
