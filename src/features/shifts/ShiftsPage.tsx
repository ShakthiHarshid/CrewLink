import { useMemo, useState, type FormEvent } from 'react';
import { CalendarClock, CircleCheck, MapPin, Plus, ShieldAlert } from 'lucide-react';
import { Badge, EmptyState, Field, Notice, PageHeading, Panel } from '../../components/ui';
import { useWorkspace } from '../../hooks/useWorkspace';
import { attendanceForShift, recordedHours, scheduledHours } from '../../lib/calculations';
import { shiftSchema } from '../../lib/validation';
import { useAppLanguage } from '../../i18n/useLanguage';
import { text } from '../../i18n';
import type { Shift } from '../../types/domain';

const displayTime = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const displayDate = (iso: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));
const toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function ShiftsPage() {
  const workspace = useWorkspace();
  const t = text(useAppLanguage());
  const manager = workspace.role !== 'worker';
  const [showCreate, setShowCreate] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState('');
  const [pending, setPending] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const now = new Date();
  const defaultStart = new Date(now); defaultStart.setHours(7, 0, 0, 0); if (defaultStart < now) defaultStart.setDate(defaultStart.getDate() + 1);
  const defaultEnd = new Date(defaultStart); defaultEnd.setHours(defaultStart.getHours() + 8);
  const [newShift, setNewShift] = useState({ workerId: '', siteId: '', title: '', startAt: toLocalInput(defaultStart), endAt: toLocalInput(defaultEnd) });
  const shifts = useMemo(() => workspace.data.shifts.filter((shift) => shift.organizationId === workspace.orgId && shift.status === 'scheduled' && (manager || shift.workerId === workspace.workerId)).sort((a, b) => a.startAt.localeCompare(b.startAt)), [manager, workspace.data.shifts, workspace.orgId, workspace.workerId]);
  const workers = workspace.data.workers.filter((worker) => worker.organizationId === workspace.orgId && worker.active);
  const sites = workspace.org?.sites ?? [];
  const hasOpenCheckOut = shifts.some((shift) => {
    const attendance = attendanceForShift(workspace.data.attendance, shift.id);
    return attendance?.checkInAt && !attendance.checkOutAt;
  });

  const onCheck = async (shift: Shift, action: 'in' | 'out') => {
    setPending(shift.id); setMessage(''); setError('');
    try {
      if (action === 'in') await workspace.checkIn(shift.id); else await workspace.checkOut(shift.id);
      setMessage(action === 'in' ? 'Check-in recorded. Have a safe shift.' : 'Check-out recorded. Your work hours are updated.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Attendance could not be saved. Try again.'); }
    finally { setPending(''); }
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage('');
    const payload = { ...newShift, startAt: new Date(newShift.startAt).toISOString(), endAt: new Date(newShift.endAt).toISOString() };
    const parsed = shiftSchema.safeParse(payload);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Review the shift details.'); return; }
    setPending('create');
    try {
      if (editingShiftId) { await workspace.updateShift(editingShiftId, parsed.data); setMessage('Shift details updated.'); }
      else { await workspace.createShift(parsed.data); setMessage('Shift created and added to the roster.'); }
      setShowCreate(false); setEditingShiftId(''); setNewShift({ ...newShift, title: '' });
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Shift could not be created.'); }
    finally { setPending(''); }
  };

  const editShift = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setNewShift({ workerId: shift.workerId, siteId: shift.siteId, title: shift.title, startAt: toLocalInput(new Date(shift.startAt)), endAt: toLocalInput(new Date(shift.endAt)) });
    setShowCreate(true);
    setMessage(''); setError('');
  };

  const cancelShift = async (shift: Shift) => {
    setPending(shift.id); setMessage(''); setError('');
    try { await workspace.cancelShift(shift.id); setMessage('Shift cancelled and removed from the active roster.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Shift could not be cancelled.'); }
    finally { setPending(''); }
  };

  return <div className="page-stack">
    <PageHeading eyebrow="TIME & COVERAGE" title={t.shifts} description={manager ? 'See staffing coverage and review check-in records across your organization.' : 'Your assigned shifts and attendance records, together in one view.'} action={manager ? <button className="button button-primary" onClick={() => { setShowCreate((open) => !open); setEditingShiftId(''); }}><Plus size={17} />{showCreate ? t.closeForm : t.createShift}</button> : undefined} />
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    {!manager && hasOpenCheckOut && <Notice tone="info"><strong>Remember to check out.</strong> Your recorded hours are not complete until you finish your shift.</Notice>}
    {showCreate && manager && <Panel className="form-panel"><div className="section-heading"><div><p className="eyebrow">ROSTER PLANNING</p><h2>{editingShiftId ? t.edit : t.createShift}</h2></div></div><form onSubmit={(event) => void onCreate(event)} className="form-grid">
      <Field label={t.shiftTitle}><input required minLength={2} maxLength={80} value={newShift.title} onChange={(event) => setNewShift({ ...newShift, title: event.target.value })} placeholder="e.g. Morning grounds round" /></Field>
      <Field label={t.assignedWorker}><select required value={newShift.workerId} onChange={(event) => setNewShift({ ...newShift, workerId: event.target.value })}><option value="">Choose a worker</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.jobTitle}</option>)}</select></Field>
      <Field label={t.siteDepartment}><select required value={newShift.siteId} onChange={(event) => setNewShift({ ...newShift, siteId: event.target.value })}><option value="">Choose a location</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></Field>
      <Field label={t.starts}><input required type="datetime-local" value={newShift.startAt} onChange={(event) => setNewShift({ ...newShift, startAt: event.target.value })} /></Field>
      <Field label={t.ends}><input required type="datetime-local" value={newShift.endAt} onChange={(event) => setNewShift({ ...newShift, endAt: event.target.value })} /></Field>
      <div className="form-actions"><button className="button button-primary" disabled={pending === 'create'}>{pending === 'create' ? 'Saving…' : editingShiftId ? t.saveShift : t.addShift}</button></div>
    </form></Panel>}
    <Panel className="table-panel"><div className="section-heading"><div><p className="eyebrow">{manager ? 'ORGANIZATION ROSTER' : 'YOUR ASSIGNMENTS'}</p><h2>{manager ? `${shifts.length} scheduled shifts` : 'Your assigned shifts'}</h2></div><span className="quiet-count"><CalendarClock size={16} /> Sorted by start time</span></div>
      {shifts.length ? <div className="table-wrap"><table><thead><tr><th>{t.shifts}</th>{manager && <th>{t.worker}</th>}<th>{t.siteDepartment}</th><th>{t.starts}</th><th>{t.attendance}</th><th>{t.recorded}</th>{manager ? <th>{t.manage}</th> : <th>{t.action}</th>}</tr></thead><tbody>{shifts.map((shift) => {
        const worker = workers.find((item) => item.id === shift.workerId);
        const site = sites.find((item) => item.id === shift.siteId);
        const attendance = attendanceForShift(workspace.data.attendance, shift.id);
        const hours = recordedHours(attendance);
        const currentlyWorking = Boolean(attendance?.checkInAt && !attendance.checkOutAt);
        return <tr key={shift.id}><td><strong>{shift.title}</strong><span className="table-sub">{displayDate(shift.startAt)} · {scheduledHours(shift.startAt, shift.endAt).toFixed(1)}h planned</span></td>{manager && <td><div className="worker-cell"><span className="avatar avatar-small">{worker?.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{worker?.name ?? 'Unassigned'}</strong><span className="table-sub">{worker?.jobTitle}</span></div></div></td>}<td><span className="location-cell"><MapPin size={14} />{site?.name ?? 'Site unavailable'}</span></td><td><strong>{displayTime(shift.startAt)}–{displayTime(shift.endAt)}</strong><span className="table-sub">{displayDate(shift.startAt)}</span></td><td>{attendance?.checkOutAt ? <Badge tone="good">Complete</Badge> : currentlyWorking ? <Badge tone="warning">In progress</Badge> : attendance?.checkInAt ? <Badge tone="warning">Check-out needed</Badge> : <Badge>Not checked in</Badge>}</td><td>{hours ? `${hours.toFixed(1)} hrs` : <span className="muted">—</span>}</td>{manager ? <td><div className="row-actions"><button className="button button-secondary button-small" disabled={Boolean(pending) || Boolean(attendance?.checkInAt)} onClick={() => editShift(shift)}>{t.edit}</button><button className="button button-danger button-small" disabled={Boolean(pending) || Boolean(attendance?.checkInAt)} onClick={() => void cancelShift(shift)}>{pending === shift.id ? 'Saving…' : t.cancel}</button></div></td> : <td>{currentlyWorking ? <button className="button button-secondary button-small" disabled={pending === shift.id} onClick={() => void onCheck(shift, 'out')}>{pending === shift.id ? 'Saving…' : t.checkOut}</button> : attendance?.checkOutAt ? <span className="completed-label"><CircleCheck size={15} />Done</span> : <button className="button button-primary button-small" disabled={pending === shift.id || Boolean(attendance?.checkInAt)} onClick={() => void onCheck(shift, 'in')}>{pending === shift.id ? 'Saving…' : t.checkIn}</button>}</td>}</tr>;
      })}</tbody></table></div> : <EmptyState icon={<CalendarClock size={22} />} title="No shifts to show" detail="Assigned work will appear here as soon as your roster is updated." />}
    </Panel>
    <div className="support-note"><ShieldAlert size={17} /><span>{t.locationVerification}</span></div>
  </div>;
}
