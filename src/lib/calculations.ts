import type { AttendanceRecord, Organization, PayStatement, Shift, WorkspaceData } from '../types/domain';

const HOUR_MS = 60 * 60 * 1000;

export function scheduledHours(startAt: string, endAt: string): number {
  const start = Date.parse(startAt);
  let end = Date.parse(endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end === start) return 0;
  if (end < start) end += 24 * HOUR_MS;
  return Math.max(0, (end - start) / HOUR_MS);
}

export function recordedHours(record?: AttendanceRecord): number {
  if (!record?.checkInAt || !record.checkOutAt) return 0;
  const start = Date.parse(record.checkInAt);
  const end = Date.parse(record.checkOutAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / HOUR_MS;
}

export function attendanceForShift(records: AttendanceRecord[], shiftId: string): AttendanceRecord | undefined {
  return records.find((record) => record.shiftId === shiftId);
}

export function splitRegularAndOvertime(hours: number, thresholdHours: number): { regular: number; overtime: number } {
  const safeHours = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const threshold = Number.isFinite(thresholdHours) ? Math.max(0, thresholdHours) : 0;
  return { regular: Math.min(safeHours, threshold), overtime: Math.max(0, safeHours - threshold) };
}

export function calculateStatement(input: {
  regularHours: number;
  overtimeHours: number;
  baseRateMinor: number;
  overtimeMultiplier: number;
  allowancesMinor?: number;
  deductionsMinor?: number;
}): Pick<PayStatement, 'grossMinor' | 'netMinor'> {
  const nonnegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
  const safeRate = Math.trunc(nonnegative(input.baseRateMinor));
  const safeMultiplier = Number.isFinite(input.overtimeMultiplier) ? Math.max(1, input.overtimeMultiplier) : 1;
  const regular = nonnegative(input.regularHours) * safeRate;
  const overtime = nonnegative(input.overtimeHours) * safeRate * safeMultiplier;
  const allowances = Math.trunc(nonnegative(input.allowancesMinor ?? 0));
  const deductions = Math.trunc(nonnegative(input.deductionsMinor ?? 0));
  const grossMinor = Math.round(regular + overtime + allowances);
  return { grossMinor, netMinor: Math.max(0, grossMinor - deductions) };
}

export function restIntervalHours(previousEndAt: string, nextStartAt: string): number {
  const previous = Date.parse(previousEndAt);
  const next = Date.parse(nextStartAt);
  if (!Number.isFinite(previous) || !Number.isFinite(next)) return Number.POSITIVE_INFINITY;
  return (next - previous) / HOUR_MS;
}

export function formatMoney(minor: number, currency: string, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100);
}

export function filterByRange<T extends { createdAt?: string; startAt?: string }>(
  records: T[],
  range: '7d' | '30d' | '90d',
  now = Date.now(),
): T[] {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = now - days * 24 * HOUR_MS;
  return records.filter((record) => {
    const date = Date.parse(record.createdAt ?? record.startAt ?? '');
    return Number.isFinite(date) && date >= cutoff && date <= now;
  });
}

export function generateAlerts(data: WorkspaceData, organization: Organization, now = Date.now()) {
  const alerts = [] as Array<{ id: string; severity: 'warning' | 'high'; title: string; explanation: string; relatedId?: string }>;
  const orgShifts = data.shifts.filter((shift) => shift.organizationId === organization.id && shift.status === 'scheduled');
  const orgAttendance = data.attendance.filter((record) => record.organizationId === organization.id);
  const weekStart = now - 7 * 24 * HOUR_MS;
  const weeklyHours = new Map<string, number>();
  const shiftsByWorker = new Map<string, Shift[]>();
  for (const shift of orgShifts) shiftsByWorker.set(shift.workerId, [...(shiftsByWorker.get(shift.workerId) ?? []), shift]);
  for (const [workerId, shifts] of shiftsByWorker) {
    const ordered = shifts.sort((a, b) => a.startAt.localeCompare(b.startAt));
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const next = ordered[index];
      if (!previous || !next) continue;
      const rest = restIntervalHours(previous.endAt, next.startAt);
      if (rest < organization.minRestHours) {
        alerts.push({ id: `rest-${next.id}`, severity: 'warning', title: rest < 0 ? 'Overlapping shifts' : 'Short rest interval', explanation: rest < 0 ? `Scheduled shifts overlap by ${Math.abs(rest).toFixed(1)} hours for worker ${workerId}.` : `Only ${rest.toFixed(1)} hours of rest are scheduled; policy minimum is ${organization.minRestHours} hours for worker ${workerId}.`, relatedId: next.id });
      }
    }
  }
  for (const record of orgAttendance) {
    if (!record.checkInAt) continue;
    const stamp = Date.parse(record.checkInAt);
    if (stamp >= weekStart && stamp <= now) weeklyHours.set(record.workerId, (weeklyHours.get(record.workerId) ?? 0) + recordedHours(record));
    if (record.checkInAt && !record.checkOutAt && stamp < now - 12 * HOUR_MS) {
      alerts.push({ id: `missing-${record.id}`, severity: 'warning', title: 'Missing check-out', explanation: 'A shift has no recorded check-out after 12 hours.', relatedId: record.shiftId });
    }
  }
  for (const [workerId, hours] of weeklyHours) {
    if (hours > organization.overtimeThresholdHours) alerts.push({ id: `hours-${workerId}`, severity: 'high', title: 'High recorded hours', explanation: `${Math.round(hours)} recorded hours in the last 7 days; the configured review threshold is ${organization.overtimeThresholdHours} hours.` });
  }
  for (const report of data.safetyReports.filter((item) => item.organizationId === organization.id && ['high', 'critical'].includes(item.severity) && item.status !== 'resolved')) {
    alerts.push({ id: `safety-${report.id}`, severity: 'high', title: 'Unresolved high-priority safety report', explanation: `${report.severity} severity report is ${report.status.replace('_', ' ')}.`, relatedId: report.id });
  }
  for (const shift of orgShifts) {
    const attendance = attendanceForShift(orgAttendance, shift.id);
    if (Date.parse(shift.endAt) < now && !attendance?.checkInAt) {
      alerts.push({ id: `unattended-${shift.id}`, severity: 'warning', title: 'Shift attendance not recorded', explanation: 'A scheduled shift has ended without a check-in record.', relatedId: shift.id });
    }
  }
  return alerts;
}

export function canTransitionSafety(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    submitted: ['acknowledged'],
    acknowledged: ['in_progress'],
    in_progress: ['resolved'],
    resolved: ['reopened'],
    reopened: ['acknowledged'],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function canTransitionGrievance(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    submitted: ['under_review'],
    under_review: ['escalated'],
    escalated: ['resolved'],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function completedShifts(data: WorkspaceData, shifts: Shift[]) {
  return shifts.filter((shift) => Boolean(attendanceForShift(data.attendance, shift.id)?.checkOutAt));
}
