import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiAuth, ApiError } from '../../shared/lib/api';
import { Field } from '../../shared/ui/Field';
import { Button } from '../../shared/ui/Button';
import { Alert } from '../../shared/ui/Alert';

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
    <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 className="text-2xl font-bold mb-4">Verify your email</h1>
      <p className="muted mb-4">
        Paste the token from your verification email. In dev with no SMTP configured, the server logs an
        Ethereal preview URL you can open to read the email.
      </p>
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
          label="Verification token"
          name="token"
          required
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Button type="submit" loading={loading} className="mt-2">Verify</Button>
      </form>
      <div className="mt-4 text-sm muted">
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
