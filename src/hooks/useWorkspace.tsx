import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import {
  addDoc, collection, doc, documentId, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where, writeBatch,
  type DocumentData, type Query, type QueryDocumentSnapshot, Timestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth, db, firebaseConfigured } from '../lib/firebase/client';
import { canTransitionGrievance, canTransitionSafety } from '../lib/calculations';
import { demoData } from '../services/demo/fixtures';
import type { AttendanceRecord, DemoSession, Grievance, GrievanceStatus, Organization, PayStatement, SafetyReport, SafetyStatus, Shift, SkillRecord, UserRole, Worker, WorkspaceData } from '../types/domain';

export type WorkspaceMode = 'demo' | 'firebase';
type NewShift = Pick<Shift, 'workerId' | 'siteId' | 'title' | 'startAt' | 'endAt'>;
type NewSafety = Pick<SafetyReport, 'siteId' | 'category' | 'description' | 'severity'>;
type NewGrievance = Pick<Grievance, 'category' | 'message' | 'anonymous'>;
type NewWorker = Pick<Worker, 'name' | 'jobTitle' | 'siteId'> & { hourlyRateMinor: number };

interface WorkspaceContextValue {
  mode: WorkspaceMode;
  data: WorkspaceData;
  org: Organization | undefined;
  orgId: string;
  role: UserRole;
  workerId: string;
  user: User | null;
  memberships: Array<{ organizationId: string; organizationName: string; role: UserRole; workerId: string }>;
  loading: boolean;
  error: string;
  setDemoRole: (role: UserRole) => void;
  switchOrganization: (organizationId: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  checkIn: (shiftId: string) => Promise<void>;
  checkOut: (shiftId: string) => Promise<void>;
  createShift: (input: NewShift) => Promise<void>;
  updateShift: (shiftId: string, input: NewShift) => Promise<void>;
  cancelShift: (shiftId: string) => Promise<void>;
  createSafetyReport: (input: NewSafety) => Promise<void>;
  transitionSafety: (reportId: string, status: SafetyStatus, note?: string) => Promise<void>;
  createGrievance: (input: NewGrievance) => Promise<void>;
  transitionGrievance: (grievanceId: string, status: GrievanceStatus) => Promise<void>;
  addSkill: (input: Pick<SkillRecord, 'name' | 'type' | 'issuer' | 'issuedOn' | 'expiresOn'>) => Promise<void>;
  verifySkill: (skillId: string) => Promise<void>;
  createWorker: (worker: NewWorker) => Promise<void>;
  createPayStatement: (statement: Omit<PayStatement, 'id' | 'createdAt'>) => Promise<void>;
}

const DEMO_DATA_KEY = 'karyapulse.demo.data.v1';
const DEMO_SESSION_KEY = 'karyapulse.demo.session.v1';
const LANGUAGE_KEY = 'karyapulse.language.v1';
const selectedMode: WorkspaceMode = import.meta.env.MODE !== 'test' && import.meta.env['VITE_APP_MODE'] === 'firebase' ? 'firebase' : 'demo';
const emptyWorkspaceData: WorkspaceData = { organizations: [], workers: [], shifts: [], attendance: [], payStatements: [], safetyReports: [], grievances: [], skills: [], alerts: [] };

const initialSession: DemoSession = { role: 'worker', workerId: 'worker-arun', organizationId: 'org-build' };

function safeLoad<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeValue(entry)]));
  }
  return value;
}

function readDocument<T>(snapshot: QueryDocumentSnapshot<DocumentData>): T {
  const normalized = normalizeValue(snapshot.data()) as Record<string, unknown>;
  if (typeof normalized['reporterWorkerId'] === 'string') normalized['reporterId'] = normalized['reporterWorkerId'];
  return { ...normalized, id: snapshot.id } as T;
}

function recordNotFound(message = 'This record could not be found. Refresh and try again.') {
  return new Error(message);
}

function createRecordId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [mode] = useState<WorkspaceMode>(selectedMode);
  const firebaseReady = firebaseConfigured && Boolean(auth && db);
  const [data, setData] = useState<WorkspaceData>(() => safeLoad(DEMO_DATA_KEY, demoData));
  const [session, setSession] = useState<DemoSession>(() => safeLoad(DEMO_SESSION_KEY, initialSession));
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<WorkspaceContextValue['memberships']>([]);
  const [cloudData, setCloudData] = useState<WorkspaceData>(emptyWorkspaceData);
  const [cloudRates, setCloudRates] = useState<Record<string, number>>({});
  const [cloudOrganizationId, setCloudOrganizationId] = useState('');
  const [loading, setLoading] = useState(mode === 'firebase' && firebaseReady);
  const [error, setError] = useState(mode === 'firebase' && !firebaseReady ? 'Firebase mode is selected, but the required web configuration is missing. Set the VITE_FIREBASE_* values or switch VITE_APP_MODE back to demo.' : '');

  useEffect(() => {
    if (mode === 'demo') {
      localStorage.setItem(DEMO_DATA_KEY, JSON.stringify(data));
      localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    }
  }, [data, mode, session]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, localStorage.getItem(LANGUAGE_KEY) ?? 'en');
  }, []);

  useEffect(() => {
    if (mode !== 'firebase') return;
    const firestore = db;
    if (!firebaseConfigured || !auth || !firestore) return;
    let unsubscribeMembership: (() => void) | undefined;
    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      unsubscribeMembership?.();
      unsubscribeMembership = undefined;
      setUser(nextUser);
      setError('');
      setMemberships([]);
      setCloudOrganizationId('');
      setCloudData(emptyWorkspaceData);
      setCloudRates({});
      if (!nextUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      unsubscribeMembership = onSnapshot(collection(firestore, 'users', nextUser.uid, 'memberships'), (snapshot) => {
        const next = snapshot.docs.map((item) => {
          const value = normalizeValue(item.data()) as Record<string, unknown>;
          return {
            organizationId: String(value['organizationId'] ?? item.id),
            organizationName: String(value['organizationName'] ?? 'Organization'),
            role: (value['role'] === 'admin' || value['role'] === 'supervisor' ? value['role'] : 'worker') as UserRole,
            workerId: String(value['workerId'] ?? nextUser.uid),
            active: value['active'] === true,
          };
        }).filter((item) => item.active).map((item) => ({ organizationId: item.organizationId, organizationName: item.organizationName, role: item.role, workerId: item.workerId }));
        setMemberships(next);
        const previous = localStorage.getItem('karyapulse.cloud.organization');
        setCloudOrganizationId(next.some((item) => item.organizationId === previous) ? previous ?? '' : next[0]?.organizationId ?? '');
        if (!next.length) setError('This account has no active organization membership. Ask an organization administrator to provision access.');
        setLoading(false);
      }, () => {
        setError('Your organization membership could not be loaded. Check your connection or ask an administrator to review your access.');
        setLoading(false);
      });
    }, () => {
      setError('Authentication could not be initialized. Refresh the page or check Firebase configuration.');
      setLoading(false);
    });
    return () => { unsubscribeAuth(); unsubscribeMembership?.(); };
  }, [mode]);

  const membership = memberships.find((item) => item.organizationId === cloudOrganizationId);

  useEffect(() => {
    const firestore = db;
    if (mode !== 'firebase' || !firestore || !user || !cloudOrganizationId) return;
    const root = `organizations/${cloudOrganizationId}`;
    const unsubs: Array<() => void> = [];
    const eventUnsubs = new Map<string, () => void>();
    const loadCollection = <T,>(name: string, key: keyof WorkspaceData) => {
      const collectionRef = collection(firestore, root, name);
      const manager = membership?.role === 'admin' || membership?.role === 'supervisor';
      let source: Query<DocumentData> = collectionRef;
      if (name === 'payStatements' && membership?.role !== 'admin') source = query(collectionRef, where('workerId', '==', membership?.workerId ?? ''));
      else if (!manager && name === 'safetyReports') source = query(collectionRef, where('reporterUid', '==', user.uid));
      else if (!manager && name === 'grievances') source = query(collectionRef, where('reporterUid', '==', user.uid), where('anonymous', '==', false));
      else if (!manager && name === 'workers') source = query(collectionRef, where(documentId(), '==', membership?.workerId ?? ''));
      else if (!manager && ['shifts', 'attendance', 'skills'].includes(name)) source = query(collectionRef, where('workerId', '==', membership?.workerId ?? ''));
      unsubs.push(onSnapshot(source, (snapshot) => {
        const records = snapshot.docs.map((item) => readDocument<T>(item));
        setCloudData((current) => {
          if (name === 'safetyReports') return { ...current, safetyReports: (records as unknown as SafetyReport[]).map((item) => ({ ...item, timeline: current.safetyReports.find((existing) => existing.id === item.id)?.timeline ?? [] })) };
          if (name === 'grievances') return { ...current, grievances: (records as unknown as Grievance[]).map((item) => ({ ...item, timeline: current.grievances.find((existing) => existing.id === item.id)?.timeline ?? [] })) };
          return { ...current, [key]: records } as WorkspaceData;
        });
        if (name === 'safetyReports' || name === 'grievances') {
          const reportIds = new Set((records as unknown as Array<SafetyReport | Grievance>).map((item) => `${name}/${item.id}`));
          for (const [id, unsubscribe] of eventUnsubs) {
            if (id.startsWith(`${name}/`) && !reportIds.has(id)) { unsubscribe(); eventUnsubs.delete(id); }
          }
          for (const report of records as unknown as Array<SafetyReport | Grievance>) {
            const eventKey = `${name}/${report.id}`;
            if (eventUnsubs.has(eventKey)) continue;
            const ref = collection(firestore, root, name, report.id, 'events');
            const unsubscribe = onSnapshot(ref, (eventSnapshot) => {
              // Pending serverTimestamp writes can briefly expose `at: null` in
              // the local snapshot. Skip those until the committed timestamp arrives.
              const timeline = eventSnapshot.docs
                .map((event) => normalizeValue(event.data()) as { status: string; at: unknown; actorLabel: string; note?: string })
                .filter((event): event is typeof event & { at: string } => typeof event.at === 'string')
                .sort((a, b) => a.at.localeCompare(b.at));
              if (name === 'safetyReports') setCloudData((current) => ({ ...current, safetyReports: current.safetyReports.map((item) => item.id === report.id ? { ...item, timeline: timeline as SafetyReport['timeline'] } : item) }));
              else setCloudData((current) => ({ ...current, grievances: current.grievances.map((item) => item.id === report.id ? { ...item, timeline: timeline as Grievance['timeline'] } : item) }));
            }, () => setError(`${name === 'safetyReports' ? 'Safety report' : 'Feedback'} timeline could not be loaded.`));
            eventUnsubs.set(eventKey, unsubscribe);
          }
        }
      }, () => setError(`Could not load ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}. Check the Firebase rules and connection.`)));
    };
    unsubs.push(onSnapshot(doc(firestore, root), (snapshot) => {
      setLoading(false);
      if (!snapshot.exists()) {
        setError('The selected organization is not available.');
        return;
      }
      const raw = normalizeValue(snapshot.data()) as Omit<Organization, 'id' | 'sites'>;
      setCloudData((current) => ({ ...current, organizations: [{ ...raw, id: snapshot.id, sites: current.organizations.find((org) => org.id === snapshot.id)?.sites ?? [] }] }));
    }, () => {
      setError('Organization details could not be read.');
      setLoading(false);
    }));
    loadCollection<Worker>('workers', 'workers');
    loadCollection<Shift>('shifts', 'shifts');
    loadCollection<AttendanceRecord>('attendance', 'attendance');
    loadCollection<PayStatement>('payStatements', 'payStatements');
    loadCollection<SafetyReport>('safetyReports', 'safetyReports');
    loadCollection<Grievance>('grievances', 'grievances');
    loadCollection<SkillRecord>('skills', 'skills');
    unsubs.push(onSnapshot(collection(firestore, root, 'sites'), (snapshot) => {
      const sites = snapshot.docs.map((item) => readDocument<Organization['sites'][number]>(item));
      setCloudData((current) => ({ ...current, organizations: current.organizations.map((org) => org.id === cloudOrganizationId ? { ...org, sites } : org) }));
    }, () => setError('Sites could not be loaded.')));
    if (membership?.role === 'admin') {
      unsubs.push(onSnapshot(collection(firestore, root, 'workerCompensation'), (snapshot) => {
        const rates = Object.fromEntries(snapshot.docs
          .filter((item) => Number.isSafeInteger(item.data()['hourlyRateMinor']))
          .map((item) => [item.id, Number(item.data()['hourlyRateMinor'])]));
        setCloudRates(rates);
      }, () => setError('Worker compensation details could not be loaded.')));
    }
    return () => { unsubs.forEach((unsubscribe) => unsubscribe()); eventUnsubs.forEach((unsubscribe) => unsubscribe()); };
  }, [cloudOrganizationId, memberships, membership?.role, membership?.workerId, mode, user]);

  const orgId = mode === 'demo' ? session.organizationId : cloudOrganizationId;
  const activeData = useMemo(() => mode === 'demo' ? data : {
    ...cloudData,
    workers: cloudData.workers.map((worker) => ({
      ...worker,
      hourlyRateMinor: membership?.role === 'admin' ? cloudRates[worker.id] : undefined,
    })),
  }, [cloudData, cloudRates, data, membership?.role, mode]);
  const org = activeData.organizations.find((item) => item.id === orgId);
  const role: UserRole = mode === 'demo' ? session.role : membership?.role ?? 'worker';
  const workerId = mode === 'demo' ? session.workerId : membership?.workerId ?? user?.uid ?? '';

  const setDemoRole = useCallback((nextRole: UserRole) => {
    if (mode !== 'demo') return;
    const worker = data.workers.find((item) => item.organizationId === session.organizationId && item.role === (nextRole === 'admin' ? 'supervisor' : nextRole));
    setSession((current) => ({ ...current, role: nextRole, workerId: worker?.id ?? current.workerId }));
  }, [data.workers, mode, session.organizationId]);

  const switchOrganization = useCallback((organizationId: string) => {
    if (mode === 'demo') {
      const worker = data.workers.find((item) => item.organizationId === organizationId && item.role === 'worker');
      setSession((current) => ({ ...current, organizationId, workerId: worker?.id ?? current.workerId }));
    } else {
      localStorage.setItem('karyapulse.cloud.organization', organizationId);
      setCloudOrganizationId(organizationId);
      setCloudData(emptyWorkspaceData);
      setCloudRates({});
      setLoading(true);
    }
  }, [data.workers, mode]);

  const requireCloud = useCallback(() => {
    if (mode !== 'firebase') throw recordNotFound('This operation is unavailable outside demo mode.');
    if (!db || !user || !orgId) throw recordNotFound('Sign in and select an organization before continuing.');
    return { firestore: db, uid: user.uid, organizationId: orgId, membershipRole: role, workerId };
  }, [mode, orgId, role, user, workerId]);

  const checkIn = useCallback(async (shiftId: string) => {
    if (mode === 'demo') {
      const shift = data.shifts.find((item) => item.id === shiftId && item.organizationId === session.organizationId);
      if (!shift || shift.workerId !== session.workerId) throw recordNotFound('That shift is not assigned to this demo worker.');
      if (data.attendance.find((item) => item.shiftId === shiftId)?.checkInAt) throw recordNotFound('This shift already has a check-in.');
      const now = new Date().toISOString();
      setData((current) => ({ ...current, attendance: [...current.attendance, { id: `att-${shiftId}`, organizationId: shift.organizationId, shiftId, workerId: shift.workerId, checkInAt: now, updatedAt: now }] }));
      return;
    }
    const cloud = requireCloud();
    const shift = cloudData.shifts.find((item) => item.id === shiftId);
    if (!shift || shift.workerId !== cloud.workerId) throw recordNotFound('That shift is not assigned to your account.');
    await runTransaction(cloud.firestore, async (transaction) => {
      const ref = doc(cloud.firestore, 'organizations', cloud.organizationId, 'attendance', shiftId);
      const current = await transaction.get(ref);
      if (current.exists() && current.data()['checkInAt']) throw recordNotFound('This shift already has a check-in.');
      transaction.set(ref, { organizationId: cloud.organizationId, shiftId, workerId: cloud.workerId, checkInAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    });
  }, [cloudData.shifts, data, mode, requireCloud, session]);

  const checkOut = useCallback(async (shiftId: string) => {
    if (mode === 'demo') {
      const record = data.attendance.find((item) => item.shiftId === shiftId && item.organizationId === session.organizationId);
      if (!record || record.workerId !== session.workerId || !record.checkInAt) throw recordNotFound('Check in before checking out.');
      if (record.checkOutAt) throw recordNotFound('This shift already has a check-out.');
      const now = new Date().toISOString();
      setData((current) => ({ ...current, attendance: current.attendance.map((item) => item.id === record.id ? { ...item, checkOutAt: now, updatedAt: now } : item) }));
      return;
    }
    const cloud = requireCloud();
    const record = cloudData.attendance.find((item) => item.shiftId === shiftId);
    if (!record || record.workerId !== cloud.workerId || !record.checkInAt || record.checkOutAt) throw recordNotFound('This shift cannot be checked out. Refresh and try again.');
    await updateDoc(doc(cloud.firestore, 'organizations', cloud.organizationId, 'attendance', shiftId), { checkOutAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }, [cloudData.attendance, data, mode, requireCloud, session]);

  const createShift = useCallback(async (input: NewShift) => {
    if (mode === 'demo') {
      if (session.role === 'worker') throw recordNotFound('Only a supervisor or administrator can schedule shifts.');
      const worker = data.workers.find((item) => item.id === input.workerId && item.organizationId === session.organizationId);
      if (!worker) throw recordNotFound('Choose a worker in this organization.');
      const now = new Date().toISOString();
      setData((current) => ({ ...current, shifts: [...current.shifts, { ...input, id: createRecordId(), organizationId: session.organizationId, status: 'scheduled', createdAt: now }] }));
      return;
    }
    const cloud = requireCloud();
    if (!['admin', 'supervisor'].includes(cloud.membershipRole)) throw recordNotFound('You do not have permission to schedule shifts.');
    await addDoc(collection(cloud.firestore, 'organizations', cloud.organizationId, 'shifts'), { ...input, organizationId: cloud.organizationId, status: 'scheduled', createdAt: serverTimestamp() });
  }, [data.workers, mode, requireCloud, session.organizationId, session.role]);

  const updateShift = useCallback(async (shiftId: string, input: NewShift) => {
    if (mode === 'demo') {
      if (session.role === 'worker') throw recordNotFound('Only a supervisor or administrator can edit shifts.');
      const shift = data.shifts.find((item) => item.id === shiftId && item.organizationId === session.organizationId);
      if (!shift || data.attendance.some((item) => item.shiftId === shiftId && item.checkInAt)) throw recordNotFound('A shift with attendance cannot be edited.');
      setData((current) => ({ ...current, shifts: current.shifts.map((item) => item.id === shiftId ? { ...item, ...input } : item) }));
      return;
    }
    const cloud = requireCloud();
    if (!['admin', 'supervisor'].includes(cloud.membershipRole)) throw recordNotFound('Only a supervisor or administrator can edit shifts.');
    const existing = cloudData.shifts.find((item) => item.id === shiftId);
    if (!existing || cloudData.attendance.some((item) => item.shiftId === shiftId && item.checkInAt)) throw recordNotFound('A shift with attendance cannot be edited.');
    await updateDoc(doc(cloud.firestore, 'organizations', cloud.organizationId, 'shifts', shiftId), { ...input, updatedAt: serverTimestamp() });
  }, [cloudData.attendance, cloudData.shifts, data.attendance, data.shifts, mode, requireCloud, session.organizationId, session.role]);

  const cancelShift = useCallback(async (shiftId: string) => {
    if (mode === 'demo') {
      if (session.role === 'worker') throw recordNotFound('Only a supervisor or administrator can cancel shifts.');
      if (data.attendance.some((item) => item.shiftId === shiftId && item.checkInAt)) throw recordNotFound('A shift with attendance cannot be cancelled.');
      setData((current) => ({ ...current, shifts: current.shifts.map((item) => item.id === shiftId && item.organizationId === session.organizationId ? { ...item, status: 'cancelled' } : item) }));
      return;
    }
    const cloud = requireCloud();
    if (!['admin', 'supervisor'].includes(cloud.membershipRole)) throw recordNotFound('Only a supervisor or administrator can cancel shifts.');
    await runTransaction(cloud.firestore, async (transaction) => {
      const shiftRef = doc(cloud.firestore, 'organizations', cloud.organizationId, 'shifts', shiftId);
      const attendanceRef = doc(cloud.firestore, 'organizations', cloud.organizationId, 'attendance', shiftId);
      const [shiftSnapshot, attendanceSnapshot] = await Promise.all([transaction.get(shiftRef), transaction.get(attendanceRef)]);
      if (!shiftSnapshot.exists()) throw recordNotFound();
      if (attendanceSnapshot.exists() && attendanceSnapshot.data()['checkInAt']) throw recordNotFound('A shift with attendance cannot be cancelled.');
      transaction.update(shiftRef, { status: 'cancelled', updatedAt: serverTimestamp() });
    });
  }, [data.attendance, mode, requireCloud, session.organizationId, session.role]);

  const createSafetyReport = useCallback(async (input: NewSafety) => {
    if (mode === 'demo') {
      if (!data.organizations.find((org) => org.id === session.organizationId)?.sites.some((site) => site.id === input.siteId)) throw recordNotFound('Choose a site or department in this organization.');
      const now = new Date().toISOString();
      setData((current) => ({ ...current, safetyReports: [{ ...input, id: createRecordId(), organizationId: session.organizationId, reporterId: session.workerId, status: 'submitted', createdAt: now, timeline: [{ status: 'submitted', at: now, actorLabel: current.workers.find((item) => item.id === session.workerId)?.name ?? 'Worker' }] }, ...current.safetyReports] }));
      return;
    }
    const cloud = requireCloud();
    const reportId = createRecordId();
    const eventId = createRecordId();
    const reportRef = doc(cloud.firestore, 'organizations', cloud.organizationId, 'safetyReports', reportId);
    const eventRef = doc(cloud.firestore, 'organizations', cloud.organizationId, 'safetyReports', reportId, 'events', eventId);
    const batch = writeBatch(cloud.firestore);
    batch.set(reportRef, { ...input, id: reportId, organizationId: cloud.organizationId, reporterUid: cloud.uid, reporterId: cloud.workerId, status: 'submitted', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastEventId: eventId });
    batch.set(eventRef, { status: 'submitted', at: serverTimestamp(), actorLabel: 'Worker' });
    await batch.commit();
  }, [data.organizations, mode, requireCloud, session.organizationId, session.workerId]);

  const transitionSafety = useCallback(async (reportId: string, status: SafetyStatus, note?: string) => {
    if (mode === 'demo') {
      const report = data.safetyReports.find((item) => item.id === reportId && item.organizationId === session.organizationId);
      if (!report || !canTransitionSafety(report.status, status)) throw recordNotFound('That safety status change is not allowed.');
      if (session.role === 'worker') throw recordNotFound('Only safety personnel can update report status.');
      const now = new Date().toISOString();
      setData((current) => ({ ...current, safetyReports: current.safetyReports.map((item) => item.id === reportId ? { ...item, status, timeline: [...item.timeline, { status, at: now, actorLabel: current.workers.find((worker) => worker.id === session.workerId)?.name ?? 'Worker', ...(note ? { note } : {}) }] } : item) }));
      return;
    }
    const cloud = requireCloud();
    const eventId = createRecordId();
    if (!['admin', 'supervisor'].includes(cloud.membershipRole)) throw recordNotFound('Only safety personnel can update report status.');
    await runTransaction(cloud.firestore, async (transaction) => {
      const ref = doc(cloud.firestore, 'organizations', cloud.organizationId, 'safetyReports', reportId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw recordNotFound();
      const current = snapshot.data() as Pick<SafetyReport, 'status'>;
      if (!canTransitionSafety(current.status, status)) throw recordNotFound('That safety status change is not allowed.');
      const eventRef = doc(cloud.firestore, 'organizations', cloud.organizationId, 'safetyReports', reportId, 'events', eventId);
      transaction.update(ref, { status, updatedAt: serverTimestamp(), lastEventId: eventId });
      transaction.set(eventRef, { status, at: serverTimestamp(), actorLabel: user?.displayName ?? 'Safety team', ...(note ? { note } : {}) });
    });
  }, [data.safetyReports, mode, requireCloud, session, user?.displayName]);

  const createGrievance = useCallback(async (input: NewGrievance) => {
    if (mode === 'demo') {
      const now = new Date().toISOString();
      setData((current) => ({ ...current, grievances: [{ ...input, id: createRecordId(), organizationId: session.organizationId, ...(input.anonymous ? {} : { reporterId: session.workerId }), status: 'submitted', createdAt: now, updatedAt: now, timeline: [{ status: 'submitted', at: now, actorLabel: 'Worker' }] }, ...current.grievances] }));
      return;
    }
    const cloud = requireCloud();
    const id = createRecordId();
    const eventId = createRecordId();
    const grievanceRef = doc(cloud.firestore, 'organizations', cloud.organizationId, 'grievances', id);
    const eventRef = doc(cloud.firestore, 'organizations', cloud.organizationId, 'grievances', id, 'events', eventId);
    const batch = writeBatch(cloud.firestore);
    batch.set(grievanceRef, { id, organizationId: cloud.organizationId, ...input, ...(!input.anonymous ? { reporterUid: cloud.uid, reporterWorkerId: cloud.workerId } : {}), status: 'submitted', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastEventId: eventId });
    batch.set(eventRef, { status: 'submitted', at: serverTimestamp(), actorLabel: 'Worker' });
    await batch.commit();
  }, [mode, requireCloud, session.organizationId, session.workerId]);

  const transitionGrievance = useCallback(async (grievanceId: string, status: GrievanceStatus) => {
    if (mode === 'demo') {
      if (session.role === 'worker') throw recordNotFound('Only a supervisor or administrator can review feedback.');
      const now = new Date().toISOString();
      const current = data.grievances.find((item) => item.id === grievanceId && item.organizationId === session.organizationId);
      if (!current || !canTransitionGrievance(current.status, status)) throw recordNotFound('That feedback status change is not allowed.');
      setData((currentData) => ({ ...currentData, grievances: currentData.grievances.map((item) => item.id === grievanceId && item.organizationId === session.organizationId ? { ...item, status, updatedAt: now, timeline: [...item.timeline, { status, at: now, actorLabel: 'Organization reviewer' }] } : item) }));
      return;
    }
    const cloud = requireCloud();
    if (!['admin', 'supervisor'].includes(cloud.membershipRole)) throw recordNotFound('Only a supervisor or administrator can review feedback.');
    const eventId = createRecordId();
    await runTransaction(cloud.firestore, async (transaction) => {
      const ref = doc(cloud.firestore, 'organizations', cloud.organizationId, 'grievances', grievanceId);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw recordNotFound();
      const currentStatus = (snapshot.data() as Pick<Grievance, 'status'>).status;
      if (!canTransitionGrievance(currentStatus, status)) throw recordNotFound('That feedback status change is not allowed.');
      const eventRef = doc(cloud.firestore, 'organizations', cloud.organizationId, 'grievances', grievanceId, 'events', eventId);
      transaction.update(ref, { status, updatedAt: serverTimestamp(), lastEventId: eventId });
      transaction.set(eventRef, { status, at: serverTimestamp(), actorLabel: user?.displayName ?? 'Organization reviewer' });
    });
  }, [data.grievances, mode, requireCloud, session.organizationId, session.role, user?.displayName]);

  const addSkill = useCallback(async (input: Pick<SkillRecord, 'name' | 'type' | 'issuer' | 'issuedOn' | 'expiresOn'>) => {
    if (mode === 'demo') {
      setData((current) => ({ ...current, skills: [{ ...input, id: createRecordId(), organizationId: session.organizationId, workerId: session.workerId, verification: 'pending' }, ...current.skills] }));
      return;
    }
    const cloud = requireCloud();
    await addDoc(collection(cloud.firestore, 'organizations', cloud.organizationId, 'skills'), { ...input, organizationId: cloud.organizationId, workerId: cloud.workerId, ownerUid: cloud.uid, verification: 'pending', createdAt: serverTimestamp() });
  }, [mode, requireCloud, session.organizationId, session.workerId]);

  const verifySkill = useCallback(async (skillId: string) => {
    if (mode === 'demo') {
      if (session.role === 'worker') throw recordNotFound('Only an authorized supervisor or administrator can verify credentials.');
      setData((current) => ({ ...current, skills: current.skills.map((item) => item.id === skillId && item.organizationId === session.organizationId ? { ...item, verification: 'verified' } : item) }));
      return;
    }
    const cloud = requireCloud();
    if (!['admin', 'supervisor'].includes(cloud.membershipRole)) throw recordNotFound('Only an authorized supervisor or administrator can verify credentials.');
    await updateDoc(doc(cloud.firestore, 'organizations', cloud.organizationId, 'skills', skillId), { verification: 'verified', verifiedBy: cloud.uid, verifiedAt: serverTimestamp() });
  }, [mode, requireCloud, session.organizationId, session.role]);

  const createWorker = useCallback(async (input: NewWorker) => {
    if (mode === 'demo') {
      if (session.role !== 'admin') throw recordNotFound('Only an administrator can add worker profiles.');
      const profile: Worker = { ...input, id: createRecordId(), organizationId: session.organizationId, role: 'worker', active: true };
      setData((current) => ({ ...current, workers: [...current.workers, profile] }));
      return;
    }
    const cloud = requireCloud();
    if (cloud.membershipRole !== 'admin') throw recordNotFound('Only an administrator can add worker profiles.');
    const id = createRecordId();
    const batch = writeBatch(cloud.firestore);
    batch.set(doc(cloud.firestore, 'organizations', cloud.organizationId, 'workers', id), { id, organizationId: cloud.organizationId, name: input.name, jobTitle: input.jobTitle, siteId: input.siteId, role: 'worker', active: true, createdAt: serverTimestamp() });
    batch.set(doc(cloud.firestore, 'organizations', cloud.organizationId, 'workerCompensation', id), { organizationId: cloud.organizationId, workerId: id, hourlyRateMinor: input.hourlyRateMinor, updatedAt: serverTimestamp() });
    await batch.commit();
  }, [mode, requireCloud, session.organizationId, session.role]);

  const createPayStatement = useCallback(async (statement: Omit<PayStatement, 'id' | 'createdAt'>) => {
    if (mode === 'demo') {
      if (session.role !== 'admin') throw recordNotFound('Only an administrator can create pay estimates.');
      if (statement.organizationId !== session.organizationId || !data.workers.some((worker) => worker.id === statement.workerId && worker.organizationId === session.organizationId)) throw recordNotFound('Choose a worker in this organization.');
      const now = new Date().toISOString();
      setData((current) => ({ ...current, payStatements: [{ ...statement, id: createRecordId(), createdAt: now }, ...current.payStatements] }));
      return;
    }
    const cloud = requireCloud();
    if (cloud.membershipRole !== 'admin') throw recordNotFound('Only an administrator can create pay statements.');
    await addDoc(collection(cloud.firestore, 'organizations', cloud.organizationId, 'payStatements'), { ...statement, organizationId: cloud.organizationId, createdAt: serverTimestamp() });
  }, [data.workers, mode, requireCloud, session.organizationId, session.role]);

  const value = useMemo<WorkspaceContextValue>(() => ({
    mode, data: activeData, org, orgId, role, workerId, user, memberships, loading, error,
    setDemoRole,
    switchOrganization,
    signIn: async (email, password) => {
      if (mode !== 'firebase' || !auth || !firebaseConfigured) throw recordNotFound('Cloud sign-in is unavailable while demo mode is active.');
      try { await signInWithEmailAndPassword(auth, email, password); } catch { throw recordNotFound('Sign-in failed. Check the email and password or reset access through your administrator.'); }
    },
    logOut: async () => { if (mode === 'firebase' && auth) await signOut(auth); },
    checkIn, checkOut, createShift, updateShift, cancelShift, createSafetyReport, transitionSafety, createGrievance, transitionGrievance, addSkill, verifySkill, createWorker, createPayStatement,
  }), [mode, activeData, org, orgId, role, workerId, user, memberships, loading, error, setDemoRole, switchOrganization, checkIn, checkOut, createShift, updateShift, cancelShift, createSafetyReport, transitionSafety, createGrievance, transitionGrievance, addSkill, verifySkill, createWorker, createPayStatement]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider.');
  return value;
}
