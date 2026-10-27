import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [uid, organizationId, workerId, role] = process.argv.slice(2);
const allowedRoles = new Set(['worker', 'supervisor', 'admin']);

if (!uid || !organizationId || !workerId || !role || !allowedRoles.has(role)) {
  console.error('Usage: npm run provision:membership -- <firebase-auth-uid> <organization-id> <worker-profile-id> <worker|supervisor|admin>');
  process.exitCode = 2;
} else {
  const app = initializeApp({ credential: applicationDefault() });
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  try {
    await auth.getUser(uid);
    const organizationRef = firestore.doc(`organizations/${organizationId}`);
    const workerRef = organizationRef.collection('workers').doc(workerId);
    const [organization, worker] = await Promise.all([organizationRef.get(), workerRef.get()]);
    if (!organization.exists) throw new Error('Organization document does not exist.');
    if (!worker.exists) throw new Error('Worker profile does not exist in this organization.');
    await firestore.doc(`users/${uid}/memberships/${organizationId}`).set({
      organizationId,
      organizationName: organization.get('name'),
      workerId,
      role,
      active: true,
      provisionedAt: new Date(),
    });
    console.log(`Provisioned ${role} membership for UID ${uid} in ${organizationId}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Membership provisioning failed.');
    process.exitCode = 1;
  } finally {
    await app.delete();
  }
}
