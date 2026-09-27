import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiAuth, ApiError } from '../../shared/lib/api';
import { Field } from '../../shared/ui/Field';
import { Button } from '../../shared/ui/Button';
import { Alert } from '../../shared/ui/Alert';

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
    <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 className="text-2xl font-bold mb-4">Forgot password</h1>
      {err && <Alert variant="error">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" loading={loading} className="mt-2">Send reset link</Button>
      </form>
      <div className="mt-4 text-sm muted">
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
