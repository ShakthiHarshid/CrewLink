import { useMemo, useState, type FormEvent } from 'react';
import { ClipboardCheck, LockKeyhole, MessageSquareText, Plus } from 'lucide-react';
import { Badge, EmptyState, Field, Notice, PageHeading, Panel } from '../../components/ui';
import { VoiceInputButton } from '../../components/VoiceInputButton';
import { useWorkspace } from '../../hooks/useWorkspace';
import { grievanceSchema } from '../../lib/validation';
import type { Grievance, GrievanceStatus } from '../../types/domain';
import { useAppLanguage } from '../../i18n/useLanguage';
import { text } from '../../i18n';

const statusText: Record<GrievanceStatus, string> = { submitted: 'Submitted', under_review: 'Under review', escalated: 'Escalated', resolved: 'Resolved' };
const nextStatus: Partial<Record<GrievanceStatus, GrievanceStatus>> = { submitted: 'under_review', under_review: 'escalated', escalated: 'resolved' };

export function FeedbackPage() {
  const workspace = useWorkspace();
  const t = text(useAppLanguage());
  const manager = workspace.role !== 'worker';
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ category: 'Scheduling', message: '', anonymous: false });
  const entries = useMemo(() => workspace.data.grievances.filter((item) => item.organizationId === workspace.orgId && (manager || item.reporterId === workspace.workerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [manager, workspace.data.grievances, workspace.orgId, workspace.workerId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage('');
    const parsed = grievanceSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Review your feedback.'); return; }
    setPending('new');
    try { await workspace.createGrievance(parsed.data); setMessage(parsed.data.anonymous ? 'Your anonymous feedback was submitted. Acknowledgement tracking is not available for anonymous submissions in the cloud workspace.' : 'Your feedback was submitted. You can track its status below.'); setForm({ ...form, message: '' }); setShowForm(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Feedback could not be submitted.'); }
    finally { setPending(''); }
  };

  const advance = async (entry: Grievance) => {
    const status = nextStatus[entry.status];
    if (!status) return;
    setPending(entry.id); setError(''); setMessage('');
    try { await workspace.transitionGrievance(entry.id, status); setMessage(`Feedback marked ${statusText[status].toLowerCase()}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Feedback could not be updated.'); }
    finally { setPending(''); }
  };

  return <div className="page-stack">
    <PageHeading eyebrow="CONFIDENTIAL REVIEW" title={t.feedback} description="Share a concern about work, wages, schedules, supervision, or workplace conditions." action={!manager ? <button className="button button-primary" onClick={() => setShowForm((open) => !open)}><Plus size={17} />{showForm ? t.closeForm : t.shareFeedback}</button> : undefined} />
    <div className="privacy-banner"><div className="privacy-icon"><LockKeyhole size={18} /></div><div><strong>Private by design</strong><span>Feedback is limited to authorized supervisors and administrators. Anonymous submissions omit your account identity from the feedback record; system access metadata may still exist for security and audit purposes.</span></div></div>
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    {showForm && !manager && <Panel className="form-panel"><div className="section-heading"><div><p className="eyebrow">PRIVATE SUBMISSION</p><h2>What would you like reviewed?</h2></div></div><form className="form-grid" onSubmit={(event) => void submit(event)}>
      <Field label={t.category}><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['Workload', 'Wages', 'Scheduling', 'Supervision', 'Workplace conditions', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></Field>
      <div className="form-field-with-action"><Field label={t.feedbackMessage} hint="Please avoid including another person’s sensitive information."><textarea required minLength={12} maxLength={2000} rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Share what happened and what outcome would help…" /></Field><VoiceInputButton language={localStorage.getItem('karyapulse.language.v1') === 'ta' ? 'ta' : 'en'} onTranscript={(transcript) => setForm((current) => ({ ...current, message: `${current.message}${current.message ? ' ' : ''}${transcript}` }))} /></div>
      <label className="checkbox-field"><input type="checkbox" checked={form.anonymous} onChange={(event) => setForm({ ...form, anonymous: event.target.checked })} /><span><strong>Submit anonymously</strong><small>We will not attach your worker profile to the feedback record. You will not be able to track an anonymous submission from another device.</small></span></label>
      <div className="form-actions"><button className="button button-primary" disabled={pending === 'new'}>{pending === 'new' ? 'Submitting…' : t.submitConfidentialFeedback}</button></div>
    </form></Panel>}
    <div className="section-heading section-heading-spaced"><div><p className="eyebrow">STATUS & FOLLOW-UP</p><h2>{manager ? 'Feedback queue' : 'Your feedback'} <span className="heading-count">{entries.length}</span></h2></div></div>
    {entries.length ? <div className="feedback-list">{entries.map((entry) => {
      const reporter = workspace.data.workers.find((item) => item.id === entry.reporterId);
      const next = nextStatus[entry.status];
      return <Panel key={entry.id} className="feedback-card"><div className="feedback-card-heading"><div className="feedback-icon"><MessageSquareText size={18} /></div><div className="feedback-title"><div><h3>{entry.category}</h3><Badge tone={entry.status === 'resolved' ? 'good' : entry.status === 'escalated' ? 'high' : 'warning'}>{statusText[entry.status]}</Badge></div><span>{entry.anonymous ? 'Anonymous submission' : manager ? `Submitted by ${reporter?.name ?? 'Worker'}` : 'Submitted by you'} · {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(entry.createdAt))}</span></div>{manager && next && <button className="button button-secondary button-small" disabled={pending === entry.id} onClick={() => void advance(entry)}>{pending === entry.id ? 'Updating…' : `Mark ${statusText[next].toLowerCase()}`}</button>}</div><p>{entry.message}</p><div className="timeline feedback-event-list" aria-label="Feedback status timeline">{entry.timeline.map((event, index) => <div className={`timeline-step ${index === entry.timeline.length - 1 ? 'timeline-step-current' : ''}`} key={`${event.status}-${event.at}-${index}`}><span className="timeline-marker">{index < entry.timeline.length - 1 ? '✓' : null}</span><div><strong>{statusText[event.status]}</strong><span>{event.actorLabel}</span></div><time dateTime={event.at}>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(event.at))}</time></div>)}</div></Panel>;
    })}</div> : <Panel><EmptyState icon={<ClipboardCheck size={22} />} title={manager ? 'No feedback in the queue' : 'No tracked feedback yet'} detail={manager ? 'Submitted feedback will appear here for authorized review.' : 'Your identified submissions will appear here with their current status.'} action={!manager ? <button className="button button-secondary" onClick={() => setShowForm(true)}>Share feedback</button> : undefined} /></Panel>}
    {manager && <p className="form-footnote"><LockKeyhole size={14} />Anonymous feedback records contain no reporter UID. Access to the organization’s queue is restricted by role in Firestore rules.</p>}
  </div>;
}
