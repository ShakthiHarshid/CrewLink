import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({ projectId: 'demo-karyapulse', firestore: { rules } });
});
afterAll(async () => { await testEnv.cleanup(); });
beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users/worker-one/memberships/org-one'), { organizationId: 'org-one', role: 'worker', workerId: 'w1', active: true }),
      setDoc(doc(db, 'users/worker-two/memberships/org-one'), { organizationId: 'org-one', role: 'worker', workerId: 'w2', active: true }),
      setDoc(doc(db, 'users/supervisor/memberships/org-one'), { organizationId: 'org-one', role: 'supervisor', workerId: 'w-supervisor', active: true }),
      setDoc(doc(db, 'users/manager/memberships/org-one'), { organizationId: 'org-one', role: 'admin', workerId: 'w-admin', active: true }),
      setDoc(doc(db, 'organizations/org-one'), { name: 'One' }),
      setDoc(doc(db, 'organizations/org-two'), { name: 'Two' }),
      setDoc(doc(db, 'organizations/org-one/payStatements/pay-w1'), { organizationId: 'org-one', workerId: 'w1', netMinor: 1000 }),
      setDoc(doc(db, 'organizations/org-one/payStatements/pay-w2'), { organizationId: 'org-one', workerId: 'w2', netMinor: 2000 }),
      setDoc(doc(db, 'organizations/org-two/payStatements/pay-w2-other'), { organizationId: 'org-two', workerId: 'w2', netMinor: 3000 }),
      setDoc(doc(db, 'organizations/org-one/workerCompensation/w1'), { organizationId: 'org-one', workerId: 'w1', hourlyRateMinor: 9000 }),
      setDoc(doc(db, 'organizations/org-one/workerCompensation/w2'), { organizationId: 'org-one', workerId: 'w2', hourlyRateMinor: 11000 }),
      setDoc(doc(db, 'organizations/org-one/grievances/identified-case'), { id: 'identified-case', organizationId: 'org-one', anonymous: false, reporterUid: 'worker-one', reporterWorkerId: 'w1', category: 'Scheduling', message: 'Please share shift changes earlier.', status: 'submitted', createdAt: new Date(), updatedAt: new Date() }),
      setDoc(doc(db, 'organizations/org-one/shifts/shift-w2'), { organizationId: 'org-one', workerId: 'w2', siteId: 'site', startAt: '2026-10-27T07:00:00.000Z', endAt: '2026-10-27T15:00:00.000Z', title: 'Shift', status: 'scheduled' }),
      setDoc(doc(db, 'organizations/org-one/attendance/shift-w2'), { organizationId: 'org-one', shiftId: 'shift-w2', workerId: 'w2', checkInAt: new Date('2026-10-27T07:00:00.000Z'), updatedAt: new Date('2026-10-27T07:00:00.000Z') }),
      setDoc(doc(db, 'organizations/org-one/grievances/anonymous-case'), { id: 'anonymous-case', organizationId: 'org-one', anonymous: true, category: 'Workload', message: 'Please review the schedule coverage.', status: 'submitted', createdAt: new Date(), updatedAt: new Date() }),
      setDoc(doc(db, 'organizations/org-one/safetyReports/report-one'), { id: 'report-one', organizationId: 'org-one', reporterUid: 'worker-one', reporterId: 'w1', siteId: 'site', category: 'Equipment', description: 'A protective cover is missing from the machine.', severity: 'high', status: 'submitted', createdAt: new Date(), updatedAt: new Date() }),
    ]);
  });
});

describe('Firestore role and tenant boundaries', () => {
  it('lets a worker read only their own pay statement', async () => {
    const db = testEnv.authenticatedContext('worker-one').firestore();
    await assertSucceeds(getDoc(doc(db, 'organizations/org-one/payStatements/pay-w1')));
    await assertFails(getDoc(doc(db, 'organizations/org-one/payStatements/pay-w2')));
  });

  it('requires an owner-filtered query for worker pay statements', async () => {
    const db = testEnv.authenticatedContext('worker-one').firestore();
    await assertSucceeds(getDocs(query(collection(db, 'organizations/org-one/payStatements'), where('workerId', '==', 'w1'))));
    await assertFails(getDocs(collection(db, 'organizations/org-one/payStatements')));
  });

  it('limits compensation records to administrators and the owning worker', async () => {
    const workerDb = testEnv.authenticatedContext('worker-one').firestore();
    const supervisorDb = testEnv.authenticatedContext('supervisor').firestore();
    const managerDb = testEnv.authenticatedContext('manager').firestore();
    await assertSucceeds(getDoc(doc(workerDb, 'organizations/org-one/workerCompensation/w1')));
    await assertFails(getDoc(doc(workerDb, 'organizations/org-one/workerCompensation/w2')));
    await assertFails(getDoc(doc(supervisorDb, 'organizations/org-one/workerCompensation/w2')));
    await assertSucceeds(getDoc(doc(managerDb, 'organizations/org-one/workerCompensation/w2')));
  });

  it('rejects attendance edits for another worker', async () => {
    const db = testEnv.authenticatedContext('worker-one').firestore();
    await assertFails(updateDoc(doc(db, 'organizations/org-one/attendance/shift-w2'), { checkOutAt: new Date(), updatedAt: new Date() }));
  });

  it('does not let a user assign themselves an administrator membership', async () => {
    const db = testEnv.authenticatedContext('worker-one').firestore();
    await assertFails(setDoc(doc(db, 'users/worker-one/memberships/org-one'), { organizationId: 'org-one', role: 'admin', workerId: 'w1', active: true }));
  });

  it('rejects reads across organizations without membership', async () => {
    const db = testEnv.authenticatedContext('worker-two').firestore();
    await assertFails(getDoc(doc(db, 'organizations/org-two/payStatements/pay-w2-other')));
  });

  it('hides an anonymous grievance from ordinary workers', async () => {
    const workerDb = testEnv.authenticatedContext('worker-one').firestore();
    const managerDb = testEnv.authenticatedContext('manager').firestore();
    await assertFails(getDoc(doc(workerDb, 'organizations/org-one/grievances/anonymous-case')));
    await assertSucceeds(getDoc(doc(managerDb, 'organizations/org-one/grievances/anonymous-case')));
  });

  it('allows workers to query only their identified feedback', async () => {
    const db = testEnv.authenticatedContext('worker-one').firestore();
    const ownFeedback = query(collection(db, 'organizations/org-one/grievances'), where('reporterUid', '==', 'worker-one'), where('anonymous', '==', false));
    await assertSucceeds(getDocs(ownFeedback));
    await assertFails(getDocs(query(collection(db, 'organizations/org-one/grievances'), where('reporterUid', '==', 'worker-one'))));
  });

  it('rejects an invalid safety lifecycle jump', async () => {
    const db = testEnv.authenticatedContext('manager').firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, 'organizations/org-one/safetyReports/report-one'), { status: 'resolved', updatedAt: serverTimestamp(), lastEventId: 'fake-event' });
    batch.set(doc(db, 'organizations/org-one/safetyReports/report-one/events/fake-event'), { status: 'resolved', at: serverTimestamp(), actorLabel: 'Safety team' });
    await assertFails(batch.commit());
  });

  it('requires status changes and timeline events to be committed together', async () => {
    const db = testEnv.authenticatedContext('manager').firestore();
    const batch = writeBatch(db);
    batch.update(doc(db, 'organizations/org-one/safetyReports/report-one'), { status: 'acknowledged', updatedAt: serverTimestamp(), lastEventId: 'ack-event' });
    batch.set(doc(db, 'organizations/org-one/safetyReports/report-one/events/ack-event'), { status: 'acknowledged', at: serverTimestamp(), actorLabel: 'Safety team' });
    await assertSucceeds(batch.commit());
  });

  it('blocks unauthenticated access to organization records', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'organizations/org-one')));
  });
});
