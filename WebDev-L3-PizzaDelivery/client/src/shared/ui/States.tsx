export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">🍕</div>
      <div className="font-semibold">{title}</div>
      {hint && <div className="muted text-sm mt-2">{hint}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-state">
      <span className="spinner" aria-hidden="true" /> {label}
    </div>
  );
}
