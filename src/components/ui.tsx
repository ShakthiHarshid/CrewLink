import type { PropsWithChildren, ReactNode } from 'react';

export function Panel({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted page-description">{description}</p>}</div>{action && <div className="page-action">{action}</div>}</div>;
}

export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'good' | 'warning' | 'high' | 'info' }>) {
  return <span className={`badge badge-${tone}`}><span aria-hidden="true" className="badge-dot" />{children}</span>;
}

export function Notice({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'success' | 'error' }>) {
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function EmptyState({ icon, title, detail, action }: { icon?: ReactNode; title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state">{icon && <div className="empty-icon" aria-hidden="true">{icon}</div>}<h3>{title}</h3><p className="muted">{detail}</p>{action && <div className="empty-action">{action}</div>}</div>;
}

export function Field({ label, hint, error, children }: PropsWithChildren<{ label: string; hint?: string; error?: string }>) {
  return <label className="field"><span className="field-label">{label}</span>{children}{error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}</label>;
}

export function LoadingState({ label = 'Loading workspace…' }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" />{label}</div>;
}
