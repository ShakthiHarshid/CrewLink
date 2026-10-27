import { useMemo, useState, type FormEvent } from 'react';
import { Building2, MapPin, Plus, UsersRound } from 'lucide-react';
import { Badge, EmptyState, Field, Notice, PageHeading, Panel } from '../../components/ui';
import { useWorkspace } from '../../hooks/useWorkspace';
import { formatMoney } from '../../lib/calculations';
import { useAppLanguage } from '../../i18n/useLanguage';
import { text } from '../../i18n';

export function TeamPage() {
  const workspace = useWorkspace();
  const t = text(useAppLanguage());
  const isAdmin = workspace.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const people = workspace.data.workers.filter((worker) => worker.organizationId === workspace.orgId && worker.active).sort((a, b) => a.name.localeCompare(b.name));
  const [form, setForm] = useState({ name: '', jobTitle: '', siteId: workspace.org?.sites[0]?.id ?? '', hourlyRate: '9000' });
  const coverage = useMemo(() => workspace.org?.sites.map((site) => ({ site, members: people.filter((person) => person.siteId === site.id), shifts: workspace.data.shifts.filter((shift) => shift.organizationId === workspace.orgId && shift.siteId === site.id && shift.status === 'scheduled') })) ?? [], [people, workspace.data.shifts, workspace.org, workspace.orgId]);

  if (workspace.role === 'worker') return <div className="page-stack"><PageHeading eyebrow="ORGANIZATION OPERATIONS" title="Team & sites" description="This directory is available to supervisors and administrators." /><Panel><EmptyState icon={<UsersRound size={22} />} title="Restricted to team managers" detail="Your organization limits worker directory and pay rate visibility. Ask your supervisor if you need help with an assignment." /></Panel></div>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage('');
    const rate = Number(form.hourlyRate);
    if (form.name.trim().length < 2 || form.jobTitle.trim().length < 2 || !form.siteId || !Number.isSafeInteger(rate) || rate < 0) { setError('Enter a valid name, role, site, and hourly rate in minor currency units.'); return; }
    setPending(true);
    try { await workspace.createWorker({ name: form.name.trim(), jobTitle: form.jobTitle.trim(), siteId: form.siteId, hourlyRateMinor: rate }); setMessage('Worker profile added. A trusted administrator still needs to provision account access for cloud sign-in.'); setForm({ ...form, name: '', jobTitle: '' }); setShowForm(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Worker profile could not be added.'); }
    finally { setPending(false); }
  };

  return <div className="page-stack">
    <PageHeading eyebrow="ORGANIZATION OPERATIONS" title={t.team} description="See who is assigned where and how each location is covered." action={isAdmin ? <button className="button button-primary" onClick={() => setShowForm((open) => !open)}><Plus size={17} />{showForm ? t.closeForm : 'Add worker profile'}</button> : undefined} />
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    {showForm && isAdmin && <Panel className="form-panel"><div className="section-heading"><div><p className="eyebrow">WORKER DIRECTORY</p><h2>Add a profile</h2></div></div><form className="form-grid" onSubmit={(event) => void submit(event)}>
      <Field label="Worker name"><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
      <Field label="Role / job title"><input required minLength={2} maxLength={80} value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} /></Field>
      <Field label="Site or department"><select required value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })}><option value="">Choose a location</option>{workspace.org?.sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></Field>
      <Field label={`Hourly rate (${workspace.org?.currency ?? 'INR'} minor units)`} hint="For INR, 9,500 minor units represents ₹95 per hour."><input required type="number" min="0" step="1" value={form.hourlyRate} onChange={(event) => setForm({ ...form, hourlyRate: event.target.value })} /></Field>
      <div className="form-actions"><button className="button button-primary" disabled={pending}>{pending ? 'Saving…' : 'Add worker'}</button></div>
    </form></Panel>}
    <div className="site-grid">{coverage.map(({ site, members, shifts }) => <Panel key={site.id} className="site-card"><div className="site-card-head"><div className="site-icon"><Building2 size={18} /></div><Badge tone="info">{shifts.length} shifts</Badge></div><h2>{site.name}</h2><span className="muted">{site.department ?? (workspace.org?.industry === 'construction' ? 'Work site' : 'Campus department')}</span><div className="site-stats"><div><strong>{members.length}</strong><span>active team</span></div><div><strong>{shifts.length}</strong><span>scheduled</span></div></div><div className="site-team-preview">{members.slice(0, 4).map((person) => <span className="avatar avatar-small" key={person.id} title={person.name}>{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>)}<span>{members.length ? `${members.length} assigned` : 'No active workers'}</span></div></Panel>)}</div>
    <Panel className="table-panel"><div className="section-heading"><div><p className="eyebrow">WORKER DIRECTORY</p><h2>Active team <span className="heading-count">{people.length}</span></h2></div><span className="quiet-count"><UsersRound size={15} />{people.length} profiles</span></div>{people.length ? <div className="table-wrap"><table><thead><tr><th>Worker</th><th>Site / department</th><th>Compensation</th><th>Role</th></tr></thead><tbody>{people.map((person) => <tr key={person.id}><td><div className="worker-cell"><span className="avatar avatar-small">{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{person.name}</strong><span className="table-sub">{person.jobTitle}</span></div></div></td><td><span className="location-cell"><MapPin size={14} />{workspace.org?.sites.find((site) => site.id === person.siteId)?.name ?? 'Unassigned'}</span></td><td>{isAdmin ? typeof person.hourlyRateMinor === 'number' ? `${formatMoney(person.hourlyRateMinor, workspace.org?.currency ?? 'INR')} / hr` : 'Rate not configured' : 'Administrator only'}</td><td><Badge tone={person.role === 'supervisor' ? 'info' : 'neutral'}>{person.role}</Badge></td></tr>)}</tbody></table></div> : <EmptyState icon={<UsersRound size={22} />} title="No worker profiles" detail="Worker profiles added to the selected organization will appear here." />}</Panel>
    {!isAdmin && <p className="form-footnote">Worker profiles, assignments, and pay rates are visible only to permitted organization roles. Ask an administrator to make changes.</p>}
  </div>;
}
