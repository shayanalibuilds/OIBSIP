import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiAuth, ApiError } from '../../shared/lib/api';
import { UserPlus, Info } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    const newErrs: Record<string, string> = {};
    if (!name.trim()) newErrs.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(email)) newErrs.email = 'Enter a valid email';
    if (password.length < 8) newErrs.password = 'At least 8 characters';
    else if (!/[0-9]/.test(password)) newErrs.password = 'Must contain a number';
    setErrs(newErrs);
    if (Object.keys(newErrs).length > 0) return;

    setLoading(true);
    try {
      await apiAuth.register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      navigate(`/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (e) {
      setFormErr(e instanceof ApiError ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-stack">
      <div className="section-label">Auth View 2 · Register</div>
      <div className="auth-card">
        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-intro">Join Ovenly for bespoke pizza configurations and speedier checkout.</p>
        {formErr && <div className="alert alert--error"><Info size={20} /><span>{formErr}</span></div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">Full Name</label>
            <input id="reg-name" type="text" className={`form-input${errs.name ? ' error' : ''}`} placeholder="Elena Vance" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            {errs.name && <p className="form-field__error">{errs.name}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email address</label>
            <input id="reg-email" type="email" className={`form-input${errs.email ? ' error' : ''}`} placeholder="elena@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errs.email && <p className="form-field__error">{errs.email}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <input id="reg-password" type="password" className={`form-input${errs.password ? ' error' : ''}`} placeholder="••••••••" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="input-hint">At least 8 characters and one number</p>
            {errs.password && <p className="form-field__error">{errs.password}</p>}
          </div>
          <button type="submit" className="btn btn--primary btn--full" disabled={loading} style={{ marginTop: 8, marginBottom: 20 }}>
            <span>{loading ? 'Creating…' : 'Create account'}</span>
            <UserPlus size={16} />
          </button>
          <div className="auth-links">
            <p>Already have an account? <Link to="/login">Sign in</Link></p>
          </div>
        </form>
      </div>
    </main>
  );
}
