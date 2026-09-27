import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiAuth, ApiError } from '../../shared/lib/api';
import { Field } from '../../shared/ui/Field';
import { Button } from '../../shared/ui/Button';
import { Alert } from '../../shared/ui/Alert';

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
    if (password.length < 8) {
      newErrs.password = 'At least 8 characters';
    } else if (!/[0-9]/.test(password)) {
      newErrs.password = 'Must contain a number';
    }
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
    <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
      <h1 className="text-2xl font-bold mb-4">Reset password</h1>
      {formErr && <Alert variant="error">{formErr}</Alert>}
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          required
          value={email}
          error={errs.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Reset token"
          name="token"
          required
          value={token}
          error={errs.token}
          onChange={(e) => setToken(e.target.value)}
        />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters and one number"
          value={password}
          error={errs.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={loading} className="mt-2">Update password</Button>
      </form>
      <div className="mt-4 text-sm muted">
        <Link to="/login">Back to sign in</Link>
      </div>
    </div>
  );
}
