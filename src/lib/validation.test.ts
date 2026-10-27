import { describe, expect, it } from 'vitest';
import { grievanceSchema, safetyReportSchema, shiftSchema } from './validation';

describe('workflow validation', () => {
  it('requires actionable safety report text and a real site', () => {
    expect(safetyReportSchema.safeParse({ siteId: 's1', category: 'Equipment', severity: 'high', description: 'The guard is missing.' }).success).toBe(true);
    expect(safetyReportSchema.safeParse({ siteId: '', category: 'x', severity: 'high', description: 'short' }).success).toBe(false);
  });

  it('validates feedback length and anonymity choice', () => {
    expect(grievanceSchema.safeParse({ category: 'Scheduling', message: 'Please share changes earlier.', anonymous: true }).success).toBe(true);
    expect(grievanceSchema.safeParse({ category: 'Work', message: 'short', anonymous: false }).success).toBe(false);
  });

  it('rejects shifts whose end does not follow their start', () => {
    expect(shiftSchema.safeParse({ workerId: 'w', siteId: 's', title: 'Morning round', startAt: '2026-10-27T07:00:00.000Z', endAt: '2026-10-27T15:00:00.000Z' }).success).toBe(true);
    expect(shiftSchema.safeParse({ workerId: 'w', siteId: 's', title: 'Morning round', startAt: '2026-10-27T15:00:00.000Z', endAt: '2026-10-27T07:00:00.000Z' }).success).toBe(false);
  });
});
