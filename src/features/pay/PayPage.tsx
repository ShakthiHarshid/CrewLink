import { useState, type FormEvent } from 'react';
import { CircleDollarSign, Info, Plus, WalletCards } from 'lucide-react';
import { Badge, EmptyState, Field, Notice, PageHeading, Panel } from '../../components/ui';
import { useWorkspace } from '../../hooks/useWorkspace';
import { calculateStatement, formatMoney } from '../../lib/calculations';
import { useAppLanguage } from '../../i18n/useLanguage';
import { text } from '../../i18n';

export function PayPage() {
  const workspace = useWorkspace();
  const t = text(useAppLanguage());
  const manager = workspace.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const people = workspace.data.workers.filter((worker) => worker.organizationId === workspace.orgId && worker.active && worker.role === 'worker');
  const initialWorker = people[0];
  const [form, setForm] = useState({ workerId: initialWorker?.id ?? '', periodLabel: new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date()), regularHours: '160', overtimeHours: '0', allowances: '0', deductions: '0' });
  const statements = workspace.data.payStatements.filter((item) => item.organizationId === workspace.orgId && (manager || item.workerId === workspace.workerId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const currency = workspace.org?.currency ?? 'INR';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(''); setMessage('');
    const worker = people.find((item) => item.id === form.workerId);
    const values = [form.regularHours, form.overtimeHours, form.allowances, form.deductions].map(Number);
    if (!worker || typeof worker.hourlyRateMinor !== 'number' || values.some((value) => !Number.isFinite(value) || value < 0)) { setError('Choose a worker with a configured hourly rate and enter valid non-negative amounts.'); return; }
    const [regularHours, overtimeHours, allowancesMinor, deductionsMinor] = values;
    const calculation = calculateStatement({ regularHours: regularHours ?? 0, overtimeHours: overtimeHours ?? 0, baseRateMinor: worker.hourlyRateMinor, overtimeMultiplier: workspace.org?.overtimeMultiplier ?? 1.5, allowancesMinor: allowancesMinor ?? 0, deductionsMinor: deductionsMinor ?? 0 });
    setPending(true);
    try {
      await workspace.createPayStatement({ organizationId: workspace.orgId, workerId: worker.id, periodLabel: form.periodLabel.trim(), regularHours: regularHours ?? 0, overtimeHours: overtimeHours ?? 0, baseRateMinor: worker.hourlyRateMinor, overtimeMultiplier: workspace.org?.overtimeMultiplier ?? 1.5, allowancesMinor: allowancesMinor ?? 0, deductionsMinor: deductionsMinor ?? 0, ...calculation, status: 'estimate' });
      setMessage('Draft estimate created. It is clearly marked as an estimate until reviewed and approved.'); setShowForm(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Statement could not be created.'); }
    finally { setPending(false); }
  };

  return <div className="page-stack">
    <PageHeading eyebrow="TRANSPARENT WAGES" title={t.pay} description={manager ? 'Review itemized estimates and payment status for your organization.' : 'See how recorded hours, rates, and adjustments make up your pay.'} action={manager ? <button className="button button-primary" onClick={() => setShowForm((open) => !open)}><Plus size={17} />{showForm ? t.closeForm : t.createEstimate}</button> : undefined} />
    <div className="pay-explainer"><div className="pay-explainer-icon"><Info size={17} /></div><p><strong>Transparent by design.</strong> Rates and overtime multipliers come from this organization’s configured policy. Estimates are not approved or paid amounts.</p></div>
    {message && <Notice tone="success">{message}</Notice>}{error && <Notice tone="error">{error}</Notice>}
    {showForm && manager && <Panel className="form-panel"><div className="section-heading"><div><p className="eyebrow">PAYROLL WORKFLOW</p><h2>Create a draft estimate</h2></div></div><form className="form-grid" onSubmit={(event) => void submit(event)}>
      <Field label="Worker"><select required value={form.workerId} onChange={(event) => setForm({ ...form, workerId: event.target.value })}><option value="">Choose a worker</option>{people.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></Field>
      <Field label={t.period}><input required maxLength={50} value={form.periodLabel} onChange={(event) => setForm({ ...form, periodLabel: event.target.value })} /></Field>
      <Field label={t.regularHours}><input required type="number" min="0" max="744" step="0.25" value={form.regularHours} onChange={(event) => setForm({ ...form, regularHours: event.target.value })} /></Field>
      <Field label={t.overtimeHours}><input required type="number" min="0" max="744" step="0.25" value={form.overtimeHours} onChange={(event) => setForm({ ...form, overtimeHours: event.target.value })} /></Field>
      <Field label={`${t.allowances} (${currency} minor units)`}><input type="number" min="0" step="1" value={form.allowances} onChange={(event) => setForm({ ...form, allowances: event.target.value })} /></Field>
      <Field label={`${t.deductions} (${currency} minor units)`}><input type="number" min="0" step="1" value={form.deductions} onChange={(event) => setForm({ ...form, deductions: event.target.value })} /></Field>
      <div className="form-actions"><button className="button button-primary" disabled={pending}>{pending ? 'Saving…' : t.createDraftEstimate}</button></div>
    </form></Panel>}
    {statements.length ? <div className="statement-grid">{statements.map((statement) => {
      const worker = workspace.data.workers.find((item) => item.id === statement.workerId);
      return <Panel key={statement.id} className="statement-card"><div className="statement-top"><div className="statement-icon"><WalletCards size={19} /></div><Badge tone={statement.status === 'paid' ? 'good' : statement.status === 'approved' ? 'info' : 'warning'}>{statement.status === 'estimate' ? 'Estimate' : statement.status === 'approved' ? 'Approved' : 'Paid'}</Badge></div><p className="eyebrow">{statement.periodLabel}</p><h2>{formatMoney(statement.netMinor, currency)}</h2><span className="muted">Net amount {manager && worker ? `· ${worker.name}` : ''}</span><div className="statement-divider" /><div className="statement-lines"><div><span>Regular · {statement.regularHours} hrs × {formatMoney(statement.baseRateMinor, currency)}/hr</span><strong>{formatMoney(statement.regularHours * statement.baseRateMinor, currency)}</strong></div><div><span>Overtime · {statement.overtimeHours} hrs × {formatMoney(statement.baseRateMinor, currency)} × {statement.overtimeMultiplier}</span><strong>{formatMoney(statement.overtimeHours * statement.baseRateMinor * statement.overtimeMultiplier, currency)}</strong></div><div><span>Allowances</span><strong>{formatMoney(statement.allowancesMinor, currency)}</strong></div><div><span>Deductions</span><strong>−{formatMoney(statement.deductionsMinor, currency)}</strong></div><div className="statement-total"><span>Gross amount</span><strong>{formatMoney(statement.grossMinor, currency)}</strong></div></div><p className="statement-foot"><CircleDollarSign size={14} />{statement.status === 'estimate' ? 'Calculated estimate · pending review' : statement.status === 'paid' ? 'Payment recorded' : 'Approved for payment'}</p></Panel>;
    })}</div> : <Panel><EmptyState icon={<WalletCards size={22} />} title="No pay statements yet" detail={manager ? 'Create a draft estimate from recorded or approved hours when your payroll data is ready.' : 'Your organization has not shared a pay statement with you yet.'} /></Panel>}
    {manager && <p className="form-footnote"><Info size={14} />Amounts are entered in minor currency units. For INR, 100 minor units equal ₹1. Each statement stores the rate and multiplier used for its estimate.</p>}
  </div>;
}
