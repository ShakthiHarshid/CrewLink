import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, Clock3, Plus, ShieldAlert } from 'lucide-react';
import { Badge, EmptyState, Field, Notice, PageHeading, Panel } from '../../components/ui';
import { VoiceInputButton } from '../../components/VoiceInputButton';
import { useWorkspace } from '../../hooks/useWorkspace';
import { safetyReportSchema } from '../../lib/validation';
import { useAppLanguage } from '../../i18n/useLanguage';
import { text } from '../../i18n';
import type { SafetyReport, SafetyStatus } from '../../types/domain';

const statusLabel: Record<SafetyStatus, string> = { submitted: 'Submitted', acknowledged: 'Acknowledged', in_progress: 'In progress', resolved: 'Resolved', reopened: 'Reopened' };
const nextStatus: Partial<Record<SafetyStatus, SafetyStatus>> = { submitted: 'acknowledged', acknowledged: 'in_progress', in_progress: 'resolved', resolved: 'reopened', reopened: 'acknowledged' };
const statusTone = (status: SafetyStatus) => status === 'resolved' ? 'good' : status === 'in_progress' || status === 'acknowledged' ? 'warning' : status === 'reopened' ? 'high' : 'info';
const severityTone = (severity: SafetyReport['severity']) => severity === 'critical' || severity === 'high' ? 'high' : severity === 'medium' ? 'warning' : 'neutral';

export function SafetyPage() {
  const workspace = useWorkspace();
  const t = text(useAppLanguage());
  const manager = workspace.role !== 'worker';
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ siteId: workspace.org?.sites[0]?.id ?? '', category: 'Equipment', severity: 'medium' as SafetyReport['severity'], description: '' });
  const reports = useMemo(() => workspace.data.safetyReports.filter((report) => report.organizationId === workspace.orgId && (manager || report.reporterId === workspace.workerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [manager, workspace.data.safetyReports, workspace.orgId, workspace.workerId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage('');
    const parsed = safetyReportSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Review the report details.'); return; }
    setPending('new');
    try { await workspace.createSafetyReport(parsed.data); setMessage('Your safety report was submitted. You can track its status below.'); setForm({ ...form, description: '' }); setShowForm(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The report could not be submitted.'); }
    finally { setPending(''); }
  };

  const advance = async (report: SafetyReport) => {
    const status = nextStatus[report.status];
    if (!status) return;
    setPending(report.id); setError(''); setMessage('');
    try { await workspace.transitionSafety(report.id, status); setMessage(`Report status updated to ${statusLabel[status]}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The status could not be updated.'); }
    finally { setPending(''); }
  };

  return <div className="page-stack">
    <PageHeading eyebrow="SPEAK UP, STAY SAFE" title={t.safety} description={manager ? 'Review open hazards and record the actions taken.' : 'Report hazards early and follow every update until the issue is resolved.'} action={<button className="button button-primary" onClick={() => setShowForm((open) => !open)}><Plus size={17} />{showForm ? t.closeForm : t.reportHazard}</button>} />
    <div className="safety-banner"><div className="safety-banner-icon"><ShieldAlert size={20} /></div><div><strong>Reporting a hazard helps the team act.</strong><span>For immediate danger, follow your site emergency process and contact a supervisor directly. This app does not dispatch emergency services.</span></div></div>
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    {showForm && <Panel className="form-panel"><div className="section-heading"><div><p className="eyebrow">NEW SAFETY REPORT</p><h2>What needs attention?</h2></div></div><form className="form-grid" onSubmit={(event) => void submit(event)}>
      <Field label={t.siteDepartment}><select required value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })}><option value="">Select a location</option>{workspace.org?.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></Field>
      <Field label={t.category}><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['Equipment', 'Work at height', 'Electrical', 'Facilities', 'Chemical handling', 'PPE', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></Field>
      <Field label={t.severity}><select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as SafetyReport['severity'] })}><option value="low">Low · follow-up needed</option><option value="medium">Medium · action soon</option><option value="high">High · urgent attention</option><option value="critical">Critical · immediate escalation</option></select></Field>
      <div className="form-field-with-action"><Field label={t.describeHazard} hint="Include where it is and what could happen. Avoid adding sensitive personal details."><textarea required minLength={12} maxLength={2000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe what you noticed…" /></Field><VoiceInputButton language={localStorage.getItem('karyapulse.language.v1') === 'ta' ? 'ta' : 'en'} onTranscript={(transcript) => setForm((current) => ({ ...current, description: `${current.description}${current.description ? ' ' : ''}${transcript}` }))} /></div>
      <div className="form-actions"><button className="button button-primary" disabled={pending === 'new'}>{pending === 'new' ? 'Submitting…' : t.submitSafetyReport}</button><span className="form-footnote">{t.safeNotice}</span></div>
    </form></Panel>}
    <div className="section-heading section-heading-spaced"><div><p className="eyebrow">{t.safetyTimeline}</p><h2>{manager ? 'Organization reports' : 'Your reports'} <span className="heading-count">{reports.length}</span></h2></div><span className="quiet-count"><Clock3 size={15} />Updates shown in order</span></div>
    {reports.length ? <div className="report-list">{reports.map((report) => {
      const site = workspace.org?.sites.find((item) => item.id === report.siteId);
      const reporter = workspace.data.workers.find((item) => item.id === report.reporterId);
      const next = nextStatus[report.status];
      return <Panel key={report.id} className="report-card"><div className="report-heading"><div className="report-category-icon"><AlertTriangle size={19} /></div><div className="report-title"><div className="report-title-line"><h3>{report.category}</h3><Badge tone={severityTone(report.severity)}>{report.severity}</Badge><Badge tone={statusTone(report.status)}>{statusLabel[report.status]}</Badge></div><p>{site?.name ?? 'Location unavailable'}{manager && reporter ? ` · Reported by ${reporter.name}` : ''} · {new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(report.createdAt))}</p></div>{manager && next && <button className="button button-secondary button-small" disabled={pending === report.id} onClick={() => void advance(report)}><Check size={15} />{pending === report.id ? 'Updating…' : `Mark ${statusLabel[next].toLowerCase()}`}</button>}</div>
        <p className="report-description">{report.description}</p>
        <div className="timeline" aria-label="Report status timeline">{report.timeline.map((event, index) => <div className={`timeline-step ${index === report.timeline.length - 1 ? 'timeline-step-current' : ''}`} key={`${event.status}-${event.at}-${index}`}><span className="timeline-marker">{index < report.timeline.length - 1 ? <Check size={11} /> : null}</span><div><strong>{statusLabel[event.status]}</strong><span>{event.actorLabel}{event.note ? ` · ${event.note}` : ''}</span></div><time dateTime={event.at}>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(event.at))}</time></div>)}</div>
      </Panel>;
    })}</div> : <Panel><EmptyState icon={<ShieldAlert size={22} />} title="No reports here" detail={manager ? 'Safety reports will appear as workers share hazards.' : 'You have not submitted a report yet. Early reporting helps prevent harm.'} action={<button className="button button-secondary" onClick={() => setShowForm(true)}>Report a hazard</button>} /></Panel>}
    <p className="form-footnote"><AlertTriangle size={14} />Status changes are recorded in a timeline. A report is never shown as resolved until an authorized user updates its status.</p>
  </div>;
}
