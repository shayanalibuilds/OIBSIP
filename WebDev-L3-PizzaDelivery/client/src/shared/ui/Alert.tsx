import { type ReactNode } from 'react';

type Variant = 'error' | 'success' | 'info';

const variantClass: Record<Variant, string> = {
  error: 'alert--error',
  success: 'alert--success',
  info: 'alert--info',
};

export function Alert({ variant = 'info', children }: { variant?: Variant; children: ReactNode }) {
  return <div className={`alert ${variantClass[variant]}`} role="alert">{children}</div>;
}
