import { type InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Field({ label, error, hint, id, ...rest }: Props) {
  const inputId = id ?? rest.name;
  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...rest}
      />
      {hint && !error && (
        <div id={`${inputId}-hint`} className="form-field__error muted">
          {hint}
        </div>
      )}
      {error && (
        <div id={`${inputId}-error`} className="form-field__error">
          {error}
        </div>
      )}
    </div>
  );
}
