# Security model

## Trust boundaries

- Firebase Authentication establishes account identity. Passwords are not stored in application records.
- Firebase mode reads `users/{uid}/memberships/{organizationId}`. Firestore rules consult this server-managed document; browser roles and route visibility are not security controls.
- Organization records are tenant-scoped under `organizations/{organizationId}/...`. Rules enforce membership, role, ownership, and workflow transitions.
- Demo mode uses local storage and simulated personas with sample records. Never enter real worker data in demo mode.
- Firebase web configuration is public client configuration. Admin SDK credentials and service-account keys must never be exposed to the browser or committed.

## Access model

- Workers can read their own worker, shift, attendance, pay, safety, identified feedback, and skill records. Worker list queries filter on the exact ownership field used by rules.
- Supervisors can read organization staffing, safety, feedback, and skill records and advance review states. They cannot manage memberships or payroll.
- Administrators can manage worker profiles, shifts, wage statements, and organization review workflows.
- Worker directory documents contain no wage rate. Rates live under `organizations/{orgId}/workerCompensation/{workerId}` and are readable only by administrators and the matching worker.
- Anonymous feedback omits `reporterUid` and `reporterWorkerId`, uses a random record ID, and is readable only by authorized managers. Firebase security logs may still capture authenticated request metadata. Cloud submitters cannot track anonymous reports after submission.
- Salary statements are readable by their worker and administrators. Rules deny guessed IDs and unfiltered worker queries.
- Membership documents are client read-only. A user cannot create or promote their own membership.

## Trusted provisioning

On a trusted admin machine, create the organization, sites, worker profile, and matching compensation document first. A compensation document contains `organizationId`, `workerId`, `hourlyRateMinor`, and `updatedAt`; store money as integer minor units. Create the Auth user through the organization’s onboarding process. Then provision its membership:

Before deploying these rules to an existing database, remove any legacy `hourlyRateMinor` fields from worker profile documents; Firestore rules cannot hide selected fields from a document read.

```powershell
npm run provision:membership -- <auth-uid> <organization-id> <worker-profile-id> <worker|supervisor|admin>
```

The script uses Application Default Credentials and verifies the Auth user, organization, and worker profile before creating the role membership. The first administrator must be bootstrapped by a Firebase project owner. Protect the Google Cloud IAM permission that can run the script; it can grant roles. No Admin SDK credentials belong in client code.

## Rules and deployment

Review `firestore.rules` against the real schema, business policy, and applicable jurisdiction before use. It denies unlisted paths, rejects browser membership writes, validates ownership and lifecycle transitions, and uses Firestore server timestamps for check-in/out and timeline events. Deploy only to the intended project after the emulator tests pass:

```powershell
firebase use <project-id>
firebase deploy --only firestore:rules,firestore:indexes
```

The app performs client Zod validation for useful feedback, but rules repeat authorization and critical state checks. Never relax rules to mask a failed workflow.

## Remaining risks

- Firestore rules do not provide general rate limiting. Add App Check and rate-limited trusted endpoints before high-volume or public workflows.
- No uploads are implemented. Future uploads need Storage rules, MIME/size validation, malware scanning, and retention.
- No location is collected. Device clocks and user content remain untrusted; cloud attendance and event writes use server time.
- No retention/deletion job, export, audit writer, or backup procedure is implemented. Define those operational policies before production.
- The UI avoids raw exception details, but Firebase console and infrastructure logs still require restricted access.
- No penetration test, formal security review, WCAG audit, or certification has been completed.
