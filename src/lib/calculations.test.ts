import { describe, expect, it } from 'vitest';
import { canTransitionSafety, calculateStatement, filterByRange, generateAlerts, recordedHours, restIntervalHours, scheduledHours, splitRegularAndOvertime } from './calculations';
import type { Organization, WorkspaceData } from '../types/domain';

const emptyData: WorkspaceData = { organizations: [], workers: [], shifts: [], attendance: [], payStatements: [], safetyReports: [], grievances: [], skills: [], alerts: [] };
const org: Organization = { id: 'org-1', name: 'Test works', industry: 'construction', currency: 'INR', overtimeThresholdHours: 40, overtimeMultiplier: 1.5, minRestHours: 10, sites: [] };

describe('work time calculations', () => {
  it('calculates an overnight shift and rejects invalid intervals', () => {
    expect(scheduledHours('2026-10-27T22:00:00.000Z', '2026-10-27T06:00:00.000Z')).toBe(8);
    expect(scheduledHours('not-a-date', '2026-10-27T06:00:00.000Z')).toBe(0);
    expect(scheduledHours('2026-10-27T06:00:00.000Z', '2026-10-27T06:00:00.000Z')).toBe(0);
  });

  it('counts only completed check-ins and handles cross-midnight timestamps', () => {
    expect(recordedHours({ id: 'a', organizationId: 'org-1', shiftId: 's', workerId: 'w', checkInAt: '2026-10-27T22:00:00.000Z', checkOutAt: '2026-10-28T06:15:00.000Z', updatedAt: '' })).toBe(8.25);
    expect(recordedHours({ id: 'b', organizationId: 'org-1', shiftId: 's', workerId: 'w', checkInAt: '2026-10-27T22:00:00.000Z', updatedAt: '' })).toBe(0);
  });

  it('splits hours using the organization threshold', () => {
    expect(splitRegularAndOvertime(52.5, 48)).toEqual({ regular: 48, overtime: 4.5 });
    expect(splitRegularAndOvertime(-3, 48)).toEqual({ regular: 0, overtime: 0 });
  });

  it('calculates wages in integer minor units and clamps invalid values', () => {
    expect(calculateStatement({ regularHours: 40, overtimeHours: 2, baseRateMinor: 9500, overtimeMultiplier: 1.5, allowancesMinor: 10000, deductionsMinor: 5000 })).toEqual({ grossMinor: 418500, netMinor: 413500 });
    expect(calculateStatement({ regularHours: Number.NaN, overtimeHours: -1, baseRateMinor: -200, overtimeMultiplier: Number.NaN })).toEqual({ grossMinor: 0, netMinor: 0 });
  });

  it('measures rest and flags shifts that violate policy', () => {
    expect(restIntervalHours('2026-10-27T16:00:00Z', '2026-10-28T02:00:00Z')).toBe(10);
    const data: WorkspaceData = { ...emptyData, shifts: [
      { id: 's1', organizationId: 'org-1', workerId: 'w1', siteId: 'site', title: 'Day', startAt: '2026-10-27T08:00:00Z', endAt: '2026-10-27T16:00:00Z', status: 'scheduled', createdAt: '' },
      { id: 's2', organizationId: 'org-1', workerId: 'w1', siteId: 'site', title: 'Early', startAt: '2026-10-28T00:00:00Z', endAt: '2026-10-28T08:00:00Z', status: 'scheduled', createdAt: '' },
    ] };
    expect(generateAlerts(data, org, Date.parse('2026-10-27T23:00:00Z')).some((alert) => alert.title === 'Short rest interval')).toBe(true);
  });

  it('filters by a bounded date range', () => {
    const now = Date.parse('2026-10-27T12:00:00Z');
    expect(filterByRange([{ createdAt: '2026-10-26T12:00:00Z' }, { createdAt: '2026-09-01T12:00:00Z' }, { createdAt: '2026-10-28T12:00:00Z' }], '7d', now)).toHaveLength(1);
  });

  it('allows only the documented safety lifecycle transitions', () => {
    expect(canTransitionSafety('submitted', 'acknowledged')).toBe(true);
    expect(canTransitionSafety('in_progress', 'resolved')).toBe(true);
    expect(canTransitionSafety('submitted', 'resolved')).toBe(false);
  });
});
