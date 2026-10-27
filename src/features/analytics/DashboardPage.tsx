import { useMemo, useState } from 'react';
import { ArrowUpRight, CalendarCheck2, Clock3, ShieldAlert, ShieldCheck, UsersRound, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, PageHeading, Panel } from '../../components/ui';
import { useWorkspace } from '../../hooks/useWorkspace';
import { attendanceForShift, generateAlerts, recordedHours } from '../../lib/calculations';
import { text } from '../../i18n';
import { useAppLanguage } from '../../i18n/useLanguage';

function prettyDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(value));
}
function prettyTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function DashboardPage() {
  const workspace = useWorkspace();
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [rangeEnd] = useState(() => Date.now());
  const organization = workspace.org;
  const isManager = workspace.role !== 'worker';
  const t = text(useAppLanguage());
  const orgShifts = workspace.data.shifts.filter((shift) => shift.organizationId === workspace.orgId && shift.status === 'scheduled');
  const visibleShifts = orgShifts.filter((shift) => isManager || shift.workerId === workspace.workerId).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const rangeStart = rangeEnd - (range === '7d' ? 7 : range === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000;
  const isInRange = (value: string | undefined) => {
    const timestamp = Date.parse(value ?? '');
    return Number.isFinite(timestamp) && timestamp >= rangeStart && timestamp <= rangeEnd;
  };
  const rangeShifts = visibleShifts.filter((shift) => isInRange(shift.startAt));
  const rangeAttendance = workspace.data.attendance.filter((record) =>
    record.organizationId === workspace.orgId &&
    (isManager || record.workerId === workspace.workerId) &&
    isInRange(record.checkInAt),
  );
  const scheduledCount = isManager ? orgShifts.length : visibleShifts.length;
  const checkedInCount = rangeAttendance.filter((record) => record.checkInAt).length;
  const attendanceRate = rangeShifts.length ? Math.round((checkedInCount / rangeShifts.length) * 100) : 0;
  const hours = rangeAttendance.reduce((sum, record) => sum + recordedHours(record), 0);
  const openReports = workspace.data.safetyReports.filter((item) => item.organizationId === workspace.orgId && item.status !== 'resolved' && (isManager || item.reporterId === workspace.workerId));
  const priorityReports = openReports.filter((item) => item.severity === 'high' || item.severity === 'critical');
  const pendingFeedback = workspace.data.grievances.filter((item) => item.organizationId === workspace.orgId && item.status !== 'resolved' && (isManager || item.reporterId === workspace.workerId));
  const dynamicAlerts = useMemo(() => organization ? generateAlerts(workspace.data, organization) : [], [organization, workspace.data]);
  const people = workspace.data.workers.filter((worker) => worker.organizationId === workspace.orgId && worker.active);
  const title = isManager ? 'A clearer view of today’s work' : `Good day, ${workspace.data.workers.find((item) => item.id === workspace.workerId)?.name.split(' ')[0] ?? 'there'}`;

  const cards = isManager ? [
    { label: t.scheduled, value: scheduledCount, suffix: 'active shifts', icon: UsersRound, color: 'blue' },
    { label: t.attendance, value: `${attendanceRate}%`, suffix: `${rangeAttendance.length} check-in records`, icon: CalendarCheck2, color: 'green' },
    { label: t.hours, value: hours.toFixed(1), suffix: `${range === '7d' ? 'last 7 days' : `last ${range === '30d' ? 30 : 90} days`}`, icon: Clock3, color: 'amber' },
    { label: t.openSafety, value: openReports.length, suffix: `${priorityReports.length} high priority`, icon: ShieldAlert, color: 'rose' },
  ] : [
    { label: 'My shifts', value: visibleShifts.length, suffix: 'scheduled', icon: CalendarCheck2, color: 'blue' },
    { label: t.hours, value: hours.toFixed(1), suffix: 'recorded this week', icon: Clock3, color: 'green' },
    { label: 'Pay statements', value: workspace.data.payStatements.filter((item) => item.organizationId === workspace.orgId && item.workerId === workspace.workerId).length, suffix: 'available to view', icon: WalletCards, color: 'amber' },
    { label: t.openSafety, value: workspace.data.safetyReports.filter((item) => item.organizationId === workspace.orgId && item.reporterId === workspace.workerId && item.status !== 'resolved').length, suffix: 'submitted by me', icon: ShieldAlert, color: 'rose' },
  ];

  return <div className="page-stack">
    <PageHeading eyebrow={`${t.today.toUpperCase()} · ${organization?.name ?? 'Workspace'}`} title={title} description={isManager ? 'Your teams, shifts, and safety updates in one place.' : 'Your workday, pay, and safety updates are ready when you are.'} action={<span className="date-chip">{new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>} />
    <div className="metric-grid">{cards.map((card) => <Panel key={card.label} className="metric-card"><div className={`metric-icon metric-${card.color}`}><card.icon size={19} /></div><div className="metric-body"><span>{card.label}</span><strong>{card.value}</strong><small>{card.suffix}</small></div><ArrowUpRight size={16} className="metric-arrow" /></Panel>)}</div>
    <div className="dashboard-grid">
      <Panel className="schedule-panel"><div className="section-heading"><div><p className="eyebrow">{isManager ? 'TEAM PLAN' : 'YOUR PLAN'}</p><h2>{isManager ? 'Today’s shift roster' : 'Upcoming shifts'}</h2></div><Link className="text-link" to="/shifts">Open shifts <ArrowUpRight size={15} /></Link></div>
        {visibleShifts.length ? <div className="shift-list">{visibleShifts.slice(0, 4).map((shift) => {
          const worker = people.find((item) => item.id === shift.workerId);
          const site = organization?.sites.find((item) => item.id === shift.siteId);
          const attendance = attendanceForShift(workspace.data.attendance, shift.id);
          return <div className="shift-row" key={shift.id}><div className="shift-date"><strong>{prettyDate(shift.startAt).split(' ')[1]}</strong><span>{prettyDate(shift.startAt).split(' ')[0]}</span></div><div className="shift-main"><strong>{shift.title}</strong><span>{site?.name ?? 'Site'}{isManager && worker ? ` · ${worker.name}` : ''}</span></div><div className="shift-time">{prettyTime(shift.startAt)}<span>–</span>{prettyTime(shift.endAt)}</div><div>{attendance?.checkOutAt ? <Badge tone="good">Complete</Badge> : attendance?.checkInAt ? <Badge tone="warning">On shift</Badge> : <Badge>Scheduled</Badge>}</div></div>;
        })}</div> : <EmptyState title="No shifts scheduled" detail="Your shifts will appear here when they are assigned." />}
      </Panel>
      <Panel className="safety-panel"><div className="section-heading"><div><p className="eyebrow">SAFETY & WELLBEING</p><h2>Needs attention</h2></div><div className="safety-orbit"><ShieldAlert size={18} /></div></div>
        {priorityReports.length ? <div className="attention-card"><div className="attention-top"><Badge tone="high">{priorityReports.length} priority report{priorityReports.length > 1 ? 's' : ''}</Badge><Link className="text-link" to="/safety">Review <ArrowUpRight size={14} /></Link></div><p>{priorityReports[0]?.description}</p><span>{priorityReports[0]?.category} · {priorityReports[0]?.status.replace('_', ' ')}</span></div> : <div className="calm-state"><div className="calm-icon"><ShieldCheck size={20} /></div><div><strong>No urgent safety items</strong><span>Open reports: {openReports.length}. Keep speaking up when something feels unsafe.</span></div></div>}
        <div className="mini-summary"><div><span>Feedback to review</span><strong>{isManager ? pendingFeedback.length : workspace.data.grievances.filter((item) => item.reporterId === workspace.workerId).length}</strong></div><Link className="icon-link" to="/feedback" aria-label="Open confidential feedback"><ArrowUpRight size={17} /></Link></div>
      </Panel>
    </div>
    {isManager && <div className="dashboard-grid lower-grid"><Panel><div className="section-heading"><div><p className="eyebrow">WORKFORCE SIGNALS</p><h2>Operational pulse</h2></div><select className="compact-select" aria-label="Choose dashboard date range" value={range} onChange={(event) => setRange(event.target.value as '7d' | '30d' | '90d')}><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option></select></div><div className="pulse-list"><div><span>Active workers</span><strong>{people.length}</strong><div className="pulse-track"><span style={{ width: `${Math.min(100, people.length * 12)}%` }} /></div></div><div><span>Shifts with check-ins</span><strong>{attendanceRate}%</strong><div className="pulse-track"><span style={{ width: `${attendanceRate}%` }} /></div></div><div><span>Recorded hours</span><strong>{hours.toFixed(1)}h</strong><div className="pulse-track"><span style={{ width: `${Math.min(100, (hours / Math.max(1, organization?.overtimeThresholdHours ?? 48)) * 100)}%` }} /></div></div></div></Panel><Panel><div className="section-heading"><div><p className="eyebrow">RULE-BASED</p><h2>Operational alerts</h2></div><Link className="text-link" to="/alerts">All alerts <ArrowUpRight size={15} /></Link></div>{dynamicAlerts.length ? <div className="alert-preview">{dynamicAlerts.slice(0, 3).map((alert) => <div key={alert.id} className="alert-preview-row"><span className={alert.severity === 'high' ? 'alert-dot alert-dot-high' : 'alert-dot'} /><div><strong>{alert.title}</strong><span>{alert.explanation}</span></div></div>)}</div> : <EmptyState title="No active alerts" detail="Rule-based alerts appear when records need a review." />}</Panel></div>}
  </div>;
}
