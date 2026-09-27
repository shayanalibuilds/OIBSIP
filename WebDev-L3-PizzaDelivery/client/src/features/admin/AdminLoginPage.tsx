import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { Field } from '../../shared/ui/Field';
import { Button } from '../../shared/ui/Button';
import { Alert } from '../../shared/ui/Alert';
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
    <div className="card" style={{ maxWidth: 440, margin: '0 auto' }}>
      <h1 className="text-2xl font-bold mb-4">Admin sign in</h1>
      {err && <Alert variant="error">{err}</Alert>}
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
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
        <Link to="/login">Customer sign in</Link>
      </div>
    </div>
  );
}
