import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiAuth, ApiError } from '../../shared/lib/api';
import { Field } from '../../shared/ui/Field';
import { Button } from '../../shared/ui/Button';
import { Alert } from '../../shared/ui/Alert';

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
    if (password.length < 8) {
      newErrs.password = 'At least 8 characters';
    } else if (!/[0-9]/.test(password)) {
      newErrs.password = 'Must contain a number';
    }
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
    <div className="card form-card">
      <h1>Create your account</h1>
      <p className="form-card__subtitle">Start building custom pizzas in minutes.</p>
      {formErr && <Alert variant="error"><span className="alert__icon">⚠</span><span>{formErr}</span></Alert>}
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Name"
          name="name"
          autoComplete="name"
          required
          value={name}
          error={errs.name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          error={errs.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters and one number"
          value={password}
          error={errs.password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" loading={loading} className="btn--full mt-2">Create account</Button>
      </form>
      <div className="form-links">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}
