import { useMemo } from 'react';
import { ArrowUpRight, BellRing, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, EmptyState, PageHeading, Panel } from '../../components/ui';
import { useWorkspace } from '../../hooks/useWorkspace';
import { generateAlerts } from '../../lib/calculations';
import { useAppLanguage } from '../../i18n/useLanguage';
import { text } from '../../i18n';

export function AlertsPage() {
  const workspace = useWorkspace();
  const t = text(useAppLanguage());
  const organization = workspace.org;
  const records = useMemo(() => {
    if (workspace.role !== 'worker') return workspace.data;
    return {
      ...workspace.data,
      shifts: workspace.data.shifts.filter((item) => item.workerId === workspace.workerId),
      attendance: workspace.data.attendance.filter((item) => item.workerId === workspace.workerId),
      safetyReports: workspace.data.safetyReports.filter((item) => item.reporterId === workspace.workerId),
    };
  }, [workspace.data, workspace.role, workspace.workerId]);
  const alerts = useMemo(() => organization ? generateAlerts(records, organization) : [], [organization, records]);
  const manager = workspace.role !== 'worker';

  return <div className="page-stack">
    <PageHeading eyebrow="DECISION SUPPORT" title={t.alerts} description="Rule-based signals highlight records that may need a closer look. They are not proof of misconduct or a medical assessment." />
    <div className="alert-disclaimer"><BellRing size={18} /><span>Alerts explain the data that triggered them. Review context with the people involved before taking action.</span></div>
    <div className="alert-summary-grid"><Panel className="alert-summary"><div className="alert-summary-icon"><ShieldAlert size={18} /></div><span>Open rule alerts</span><strong>{alerts.length}</strong></Panel><Panel className="alert-summary"><div className="alert-summary-icon alert-summary-warn"><BellRing size={18} /></div><span>{manager ? 'High-priority items' : 'My open check-outs'}</span><strong>{alerts.filter((alert) => alert.severity === 'high').length}</strong></Panel></div>
    {alerts.length ? <div className="alert-list">{alerts.map((alert) => <Panel key={alert.id} className={`alert-card ${alert.severity === 'high' ? 'alert-card-high' : ''}`}><div className={`alert-level ${alert.severity === 'high' ? 'alert-level-high' : ''}`}><BellRing size={17} /></div><div className="alert-copy"><div><h3>{alert.title}</h3><Badge tone={alert.severity === 'high' ? 'high' : 'warning'}>{alert.severity}</Badge></div><p>{alert.explanation}</p></div><Link className="icon-link" to={alert.relatedId?.startsWith('safety-') ? '/safety' : '/shifts'} aria-label="Review related records"><ArrowUpRight size={18} /></Link></Panel>)}</div> : <Panel><EmptyState icon={<ShieldAlert size={22} />} title="No active alerts" detail="Current records do not cross the configured alert thresholds." /></Panel>}
    <p className="form-footnote">Thresholds are organization-configured. Current rules flag check-outs missing after 12 hours, more than 60 recorded hours in seven days, and unresolved high-severity reports. Review the configuration before applying these thresholds to a specific workplace.</p>
  </div>;
}
