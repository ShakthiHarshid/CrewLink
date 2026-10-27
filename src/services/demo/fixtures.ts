import type { WorkspaceData } from '../../types/domain';

const day = (offset: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const demoData: WorkspaceData = {
  organizations: [
    {
      id: 'org-build', name: 'Sundar Buildworks', industry: 'construction', currency: 'INR', overtimeThresholdHours: 48, overtimeMultiplier: 1.5, minRestHours: 10,
      sites: [{ id: 'site-river', organizationId: 'org-build', name: 'Riverfront Residences' }, { id: 'site-metro', organizationId: 'org-build', name: 'Metro East Link' }],
    },
    {
      id: 'org-campus', name: 'Vivekananda College', industry: 'college', currency: 'INR', overtimeThresholdHours: 48, overtimeMultiplier: 1.5, minRestHours: 10,
      sites: [
        { id: 'dept-housekeeping', organizationId: 'org-campus', name: 'Housekeeping', department: 'Facilities' },
        { id: 'dept-maintenance', organizationId: 'org-campus', name: 'Maintenance', department: 'Facilities' },
        { id: 'dept-support', organizationId: 'org-campus', name: 'Campus support', department: 'Student services' },
      ],
    },
  ],
  workers: [
    { id: 'worker-arun', organizationId: 'org-build', name: 'Arun Kumar', role: 'worker', jobTitle: 'Mason', siteId: 'site-river', hourlyRateMinor: 9500, active: true },
    { id: 'worker-meena', organizationId: 'org-build', name: 'Meena Devi', role: 'worker', jobTitle: 'Safety marshal', siteId: 'site-metro', hourlyRateMinor: 11000, active: true },
    { id: 'worker-rajesh', organizationId: 'org-build', name: 'Rajesh Nair', role: 'supervisor', jobTitle: 'Site supervisor', siteId: 'site-river', hourlyRateMinor: 15000, active: true },
    { id: 'worker-priya', organizationId: 'org-campus', name: 'Priya Selvam', role: 'worker', jobTitle: 'Housekeeping attendant', siteId: 'dept-housekeeping', hourlyRateMinor: 8000, active: true },
    { id: 'worker-karthik', organizationId: 'org-campus', name: 'Karthik Ravi', role: 'worker', jobTitle: 'Maintenance technician', siteId: 'dept-maintenance', hourlyRateMinor: 10500, active: true },
    { id: 'worker-latha', organizationId: 'org-campus', name: 'Latha Krishnan', role: 'supervisor', jobTitle: 'Facilities supervisor', siteId: 'dept-support', hourlyRateMinor: 14500, active: true },
  ],
  shifts: [
    { id: 'shift-arun-today', organizationId: 'org-build', workerId: 'worker-arun', siteId: 'site-river', title: 'Masonry · Block C', startAt: day(0, 7), endAt: day(0, 15), status: 'scheduled', createdAt: day(-2, 9) },
    { id: 'shift-meena-today', organizationId: 'org-build', workerId: 'worker-meena', siteId: 'site-metro', title: 'Safety inspection', startAt: day(0, 8), endAt: day(0, 16), status: 'scheduled', createdAt: day(-2, 9) },
    { id: 'shift-arun-tomorrow', organizationId: 'org-build', workerId: 'worker-arun', siteId: 'site-river', title: 'Masonry · Block C', startAt: day(1, 7), endAt: day(1, 15), status: 'scheduled', createdAt: day(-1, 10) },
    { id: 'shift-priya-today', organizationId: 'org-campus', workerId: 'worker-priya', siteId: 'dept-housekeeping', title: 'Library and north wing', startAt: day(0, 6), endAt: day(0, 14), status: 'scheduled', createdAt: day(-2, 10) },
    { id: 'shift-karthik-today', organizationId: 'org-campus', workerId: 'worker-karthik', siteId: 'dept-maintenance', title: 'Workshop and labs', startAt: day(0, 9), endAt: day(0, 17), status: 'scheduled', createdAt: day(-2, 10) },
  ],
  attendance: [
    { id: 'att-arun-yesterday', organizationId: 'org-build', shiftId: 'shift-arun-tomorrow', workerId: 'worker-arun', checkInAt: day(-1, 6), checkOutAt: day(-1, 15), updatedAt: day(-1, 15) },
    { id: 'att-meena-open', organizationId: 'org-build', shiftId: 'shift-meena-today', workerId: 'worker-meena', checkInAt: day(0, 8), updatedAt: day(0, 8) },
    { id: 'att-priya-yesterday', organizationId: 'org-campus', shiftId: 'shift-priya-today', workerId: 'worker-priya', checkInAt: day(-1, 6), checkOutAt: day(-1, 14), updatedAt: day(-1, 14) },
  ],
  payStatements: [
    { id: 'pay-arun-sept', organizationId: 'org-build', workerId: 'worker-arun', periodLabel: 'September 2026', regularHours: 176, overtimeHours: 9, baseRateMinor: 9500, overtimeMultiplier: 1.5, allowancesMinor: 250000, deductionsMinor: 35000, grossMinor: 2050250, netMinor: 2015250, status: 'paid', createdAt: day(-20, 10) },
    { id: 'pay-meena-sept', organizationId: 'org-build', workerId: 'worker-meena', periodLabel: 'September 2026', regularHours: 168, overtimeHours: 4, baseRateMinor: 11000, overtimeMultiplier: 1.5, allowancesMinor: 100000, deductionsMinor: 0, grossMinor: 2014000, netMinor: 2014000, status: 'approved', createdAt: day(-19, 10) },
    { id: 'pay-priya-sept', organizationId: 'org-campus', workerId: 'worker-priya', periodLabel: 'September 2026', regularHours: 168, overtimeHours: 2, baseRateMinor: 8000, overtimeMultiplier: 1.5, allowancesMinor: 50000, deductionsMinor: 10000, grossMinor: 1418000, netMinor: 1408000, status: 'paid', createdAt: day(-18, 10) },
  ],
  safetyReports: [
    { id: 'safety-lifting', organizationId: 'org-build', reporterId: 'worker-arun', siteId: 'site-river', category: 'Equipment', description: 'The hoist safety latch is not closing fully. It needs inspection before the next materials lift.', severity: 'critical', status: 'acknowledged', createdAt: day(0, 7), timeline: [{ status: 'submitted', at: day(0, 7), actorLabel: 'Arun Kumar' }, { status: 'acknowledged', at: day(0, 8), actorLabel: 'Rajesh Nair', note: 'Area isolated pending inspection.' }] },
    { id: 'safety-lab', organizationId: 'org-campus', reporterId: 'worker-karthik', siteId: 'dept-maintenance', category: 'Facilities', description: 'Water is pooling near the electrical workshop entrance after the morning cleaning.', severity: 'high', status: 'in_progress', createdAt: day(-1, 8), timeline: [{ status: 'submitted', at: day(-1, 8), actorLabel: 'Karthik Ravi' }, { status: 'acknowledged', at: day(-1, 9), actorLabel: 'Latha Krishnan' }, { status: 'in_progress', at: day(-1, 10), actorLabel: 'Latha Krishnan', note: 'Cones placed; drain team assigned.' }] },
    { id: 'safety-light', organizationId: 'org-campus', reporterId: 'worker-priya', siteId: 'dept-housekeeping', category: 'Lighting', description: 'A light is out in the east corridor. Please schedule a replacement.', severity: 'low', status: 'resolved', createdAt: day(-8, 8), timeline: [{ status: 'submitted', at: day(-8, 8), actorLabel: 'Priya Selvam' }, { status: 'acknowledged', at: day(-8, 9), actorLabel: 'Latha Krishnan' }, { status: 'in_progress', at: day(-7, 10), actorLabel: 'Latha Krishnan' }, { status: 'resolved', at: day(-6, 11), actorLabel: 'Latha Krishnan', note: 'Lamp replaced and checked.' }] },
  ],
  grievances: [
    { id: 'grievance-schedule', organizationId: 'org-build', reporterId: 'worker-meena', anonymous: false, category: 'Scheduling', message: 'The shift handover time changes late in the day. Earlier notice would help arrange transport.', status: 'under_review', createdAt: day(-2, 12), updatedAt: day(-1, 10), timeline: [{ status: 'submitted', at: day(-2, 12), actorLabel: 'Worker' }, { status: 'under_review', at: day(-1, 10), actorLabel: 'Supervisor' }] },
    { id: 'grievance-campus', organizationId: 'org-campus', anonymous: true, category: 'Workload', message: 'The evening coverage has been short staffed for several weeks. Please review the rotation.', status: 'submitted', createdAt: day(-3, 12), updatedAt: day(-3, 12), timeline: [{ status: 'submitted', at: day(-3, 12), actorLabel: 'Worker' }] },
  ],
  skills: [
    { id: 'skill-arun', organizationId: 'org-build', workerId: 'worker-arun', name: 'Scaffold safety awareness', type: 'training', issuer: 'Sundar Buildworks', issuedOn: '2026-06-14', expiresOn: '2027-06-14', verification: 'verified' },
    { id: 'skill-meena', organizationId: 'org-build', workerId: 'worker-meena', name: 'First aid at work', type: 'certification', issuer: 'Tamil Nadu Safety Council', issuedOn: '2025-11-02', expiresOn: '2027-11-02', verification: 'verified' },
    { id: 'skill-priya', organizationId: 'org-campus', workerId: 'worker-priya', name: 'Chemical handling', type: 'training', issuer: 'Vivekananda College', issuedOn: '2026-08-19', verification: 'pending' },
    { id: 'skill-karthik', organizationId: 'org-campus', workerId: 'worker-karthik', name: 'Electrical maintenance', type: 'skill', issuer: 'Worker submitted', issuedOn: '2026-02-01', verification: 'unverified' },
  ],
  alerts: [],
};
