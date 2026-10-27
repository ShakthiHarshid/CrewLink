import { useMemo, useState, type FormEvent } from 'react';
import { BadgeCheck, BookOpenCheck, CalendarDays, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge, EmptyState, Field, Notice, PageHeading, Panel } from '../../components/ui';
import { useWorkspace } from '../../hooks/useWorkspace';
import type { SkillRecord } from '../../types/domain';
import { useAppLanguage } from '../../i18n/useLanguage';
import { text } from '../../i18n';

export function SkillsPage() {
  const workspace = useWorkspace();
  const t = text(useAppLanguage());
  const manager = workspace.role !== 'worker';
  const [today] = useState(() => Date.now());
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', type: 'training' as SkillRecord['type'], issuer: '', issuedOn: new Date().toISOString().slice(0, 10), expiresOn: '' });
  const entries = useMemo(() => workspace.data.skills.filter((item) => item.organizationId === workspace.orgId && (manager || item.workerId === workspace.workerId)).sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)), [manager, workspace.data.skills, workspace.orgId, workspace.workerId]);
  const people = workspace.data.workers;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage('');
    if (form.name.trim().length < 2 || form.issuer.trim().length < 2 || !form.issuedOn) { setError('Add a credential name, issuer, and issue date.'); return; }
    setPending('new');
    try { await workspace.addSkill({ ...form, name: form.name.trim(), issuer: form.issuer.trim(), ...(form.expiresOn ? { expiresOn: form.expiresOn } : {}) }); setMessage('Credential submitted for verification. It is marked pending until an authorized person reviews it.'); setForm({ ...form, name: '', issuer: '' }); setShowForm(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Credential could not be submitted.'); }
    finally { setPending(''); }
  };

  const verify = async (skillId: string) => {
    setPending(skillId); setError(''); setMessage('');
    try { await workspace.verifySkill(skillId); setMessage('Credential marked verified.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Credential could not be verified.'); }
    finally { setPending(''); }
  };

  return <div className="page-stack">
    <PageHeading eyebrow="PORTABLE EXPERIENCE" title={t.skills} description={manager ? 'Review worker skills, training, and certificates before confirming their status.' : 'Keep your skills, training, and certificates together. Unverified items are clearly marked.'} action={!manager ? <button className="button button-primary" onClick={() => setShowForm((open) => !open)}><Plus size={17} />{showForm ? t.closeForm : t.addCredential}</button> : undefined} />
    <div className="skill-summary"><div className="skill-summary-icon"><Sparkles size={19} /></div><div><strong>Portable, transparent records</strong><span>Submit credentials you hold. A supervisor verifies them; a pending or unverified item is never presented as verified.</span></div><div className="skill-summary-count"><strong>{entries.length}</strong><span>records</span></div></div>
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    {showForm && !manager && <Panel className="form-panel"><div className="section-heading"><div><p className="eyebrow">ADD TO YOUR PASSPORT</p><h2>{t.newCredential}</h2></div></div><form className="form-grid" onSubmit={(event) => void submit(event)}>
      <Field label={t.credentialName}><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. First aid at work" /></Field>
      <Field label={t.recordType}><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as SkillRecord['type'] })}><option value="skill">Skill</option><option value="training">Training</option><option value="certification">Certification</option></select></Field>
      <Field label={t.issuer}><input required minLength={2} maxLength={100} value={form.issuer} onChange={(event) => setForm({ ...form, issuer: event.target.value })} /></Field>
      <Field label={t.issueDate}><input required type="date" value={form.issuedOn} onChange={(event) => setForm({ ...form, issuedOn: event.target.value })} /></Field>
      <Field label={t.expiryDate}><input type="date" value={form.expiresOn} onChange={(event) => setForm({ ...form, expiresOn: event.target.value })} /></Field>
      <div className="form-actions"><button className="button button-primary" disabled={pending === 'new'}>{pending === 'new' ? 'Saving…' : t.submitVerification}</button></div>
    </form></Panel>}
    {entries.length ? <div className="credential-grid">{entries.map((item) => {
      const worker = people.find((person) => person.id === item.workerId);
      const statusTone = item.verification === 'verified' ? 'good' : item.verification === 'pending' ? 'warning' : 'neutral';
      const expired = item.expiresOn ? Date.parse(item.expiresOn) < today : false;
      return <Panel key={item.id} className="credential-card"><div className="credential-top"><div className="credential-icon">{item.type === 'certification' ? <BadgeCheck size={19} /> : item.type === 'training' ? <BookOpenCheck size={19} /> : <ShieldCheck size={19} />}</div><Badge tone={expired ? 'high' : statusTone}>{expired ? 'Expired' : item.verification === 'verified' ? 'Verified' : item.verification === 'pending' ? 'Pending review' : 'Unverified'}</Badge></div><p className="eyebrow">{item.type}</p><h3>{item.name}</h3><span className="credential-issuer">{item.issuer}{manager && worker ? ` · ${worker.name}` : ''}</span><div className="credential-dates"><span><CalendarDays size={14} />Issued {item.issuedOn}</span>{item.expiresOn && <span>Expires {item.expiresOn}</span>}</div>{manager && item.verification !== 'verified' && <button className="button button-secondary button-small" disabled={pending === item.id} onClick={() => void verify(item.id)}>{pending === item.id ? 'Saving…' : 'Verify record'}</button>}</Panel>;
    })}</div> : <Panel><EmptyState icon={<BookOpenCheck size={22} />} title="No skill records yet" detail={manager ? 'Worker-submitted records will appear here for verification.' : 'Add training, certifications, and practical skills you want your employer to recognize.'} action={!manager ? <button className="button button-secondary" onClick={() => setShowForm(true)}>Add a credential</button> : undefined} /></Panel>}
  </div>;
}
