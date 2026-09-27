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
    <div className="card" style={{ maxWidth: 440, margin: '0 auto' }}>
      <h1 className="text-2xl font-bold mb-4">Sign in</h1>
      {err && <Alert variant="error">{err}</Alert>}
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
        <Button type="submit" loading={loading} className="mt-2">Sign in</Button>
      </form>
      <div className="mt-4 text-sm muted">
        New here? <Link to="/register">Create an account</Link>
      </div>
      <div className="mt-2 text-sm muted">
        Forgot password? <Link to="/forgot">Reset it</Link>
      </div>
    </div>
  );
}
