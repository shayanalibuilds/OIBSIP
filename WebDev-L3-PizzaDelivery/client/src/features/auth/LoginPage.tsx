import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { Field } from '../../shared/ui/Field';
import { Button } from '../../shared/ui/Button';
import { Alert } from '../../shared/ui/Alert';
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
    <div className="card form-card">
      <h1>Sign in</h1>
      <p className="form-card__subtitle">Welcome back. Build your next pizza.</p>
      {err && <Alert variant="error"><span className="alert__icon">⚠</span><span>{err}</span></Alert>}
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={loading} className="btn--full mt-2">Sign in</Button>
      </form>
      <div className="form-links">
        New here? <Link to="/register">Create an account</Link>
      </div>
      <div className="form-links">
        Forgot password? <Link to="/forgot">Reset it</Link>
      </div>
    </div>
  );
}
