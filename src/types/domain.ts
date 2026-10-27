export type Industry = 'construction' | 'college';
export type UserRole = 'worker' | 'supervisor' | 'admin';
export type ShiftStatus = 'scheduled' | 'cancelled';
export type SafetyStatus = 'submitted' | 'acknowledged' | 'in_progress' | 'resolved' | 'reopened';
export type GrievanceStatus = 'submitted' | 'under_review' | 'escalated' | 'resolved';

export interface Organization {
  id: string;
  name: string;
  industry: Industry;
  currency: string;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
  minRestHours: number;
  sites: Site[];
}

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  department?: string;
}

export interface Worker {
  id: string;
  organizationId: string;
  name: string;
  role: UserRole;
  jobTitle: string;
  siteId: string;
  hourlyRateMinor?: number;
  active: boolean;
}

export interface Shift {
  id: string;
  organizationId: string;
  workerId: string;
  siteId: string;
  title: string;
  startAt: string;
  endAt: string;
  status: ShiftStatus;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  shiftId: string;
  workerId: string;
  checkInAt?: string;
  checkOutAt?: string;
  updatedAt: string;
}

export interface PayStatement {
  id: string;
  organizationId: string;
  workerId: string;
  periodLabel: string;
  regularHours: number;
  overtimeHours: number;
  baseRateMinor: number;
  overtimeMultiplier: number;
  allowancesMinor: number;
  deductionsMinor: number;
  grossMinor: number;
  netMinor: number;
  status: 'estimate' | 'approved' | 'paid';
  createdAt: string;
}

export interface SafetyEvent {
  status: SafetyStatus;
  at: string;
  actorLabel: string;
  note?: string;
}

export interface SafetyReport {
  id: string;
  organizationId: string;
  reporterId: string;
  siteId: string;
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: SafetyStatus;
  createdAt: string;
  timeline: SafetyEvent[];
}

export interface Grievance {
  id: string;
  organizationId: string;
  reporterId?: string;
  anonymous: boolean;
  category: string;
  message: string;
  status: GrievanceStatus;
  createdAt: string;
  updatedAt: string;
  timeline: GrievanceEvent[];
}

export interface GrievanceEvent {
  status: GrievanceStatus;
  at: string;
  actorLabel: string;
}

export interface SkillRecord {
  id: string;
  organizationId: string;
  workerId: string;
  name: string;
  type: 'skill' | 'training' | 'certification';
  issuer: string;
  issuedOn: string;
  expiresOn?: string;
  verification: 'pending' | 'verified' | 'unverified';
}

export interface OperationalAlert {
  id: string;
  organizationId: string;
  severity: 'info' | 'warning' | 'high';
  title: string;
  explanation: string;
  createdAt: string;
  relatedId?: string;
}

export interface WorkspaceData {
  organizations: Organization[];
  workers: Worker[];
  shifts: Shift[];
  attendance: AttendanceRecord[];
  payStatements: PayStatement[];
  safetyReports: SafetyReport[];
  grievances: Grievance[];
  skills: SkillRecord[];
  alerts: OperationalAlert[];
}

export interface DemoSession {
  role: UserRole;
  workerId: string;
  organizationId: string;
}
