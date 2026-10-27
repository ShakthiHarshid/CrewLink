import { useState, type FormEvent } from 'react';
import { Activity, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Field, Notice } from '../../components/ui';
import { firebaseConfigured } from '../../lib/firebase/client';
import { useWorkspace } from '../../hooks/useWorkspace';

export function AuthGate() {
  const workspace = useWorkspace();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError('');
    try { await workspace.signIn(email, password); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign-in could not be completed.'); }
    finally { setPending(false); }
  };

  return <main className="auth-screen"><section className="auth-card">
    <div className="auth-brand"><div className="brand-mark"><Activity size={21} /></div><div><strong>KaryaPulse</strong><span>WORKFORCE TRUST</span></div></div>
    <div className="auth-heading"><p className="eyebrow">SECURE WORKSPACE</p><h1>Sign in to your team</h1><p className="muted">Use the account provisioned for your organization. Roles are assigned by an administrator.</p></div>
    {!firebaseConfigured && <Notice tone="error">Firebase mode is selected but configuration is missing. Add the Firebase web values in <code>.env.local</code>, or set <code>VITE_APP_MODE=demo</code> to use the local evaluator experience.</Notice>}
    {workspace.user && !workspace.memberships.length && <Notice tone="error">This account has no organization membership. An authorized administrator must provision access before you can continue.</Notice>}
    {error && <Notice tone="error">{error}</Notice>}
    {workspace.error && !workspace.user && <Notice>{workspace.error}</Notice>}
    {firebaseConfigured && !workspace.user && <form className="form-stack" onSubmit={(event) => void submit(event)}>
      <Field label="Work email"><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
      <Field label="Password"><input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
      <button className="button button-primary button-full" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Continue'}<ArrowRight size={17} /></button>
      <p className="form-footnote"><LockKeyhole size={14} /> Password recovery is managed through your organization’s Firebase Authentication setup.</p>
    </form>}
    {workspace.user && workspace.memberships.length === 0 && <button className="button button-secondary button-full" onClick={() => void workspace.logOut()}>Sign out</button>}
    <div className="auth-footer"><ShieldCheck size={16} /><span>Your organization controls access to worker and payroll records.</span></div>
  </section></main>;
}
