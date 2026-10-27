# Architecture and data model

## Application layers

- `src/app/` owns routes and the responsive shell.
- `src/features/` contains analytics, shifts, pay, safety, feedback, skills, organization, alerts, and sign-in workflows.
- `src/components/` contains shared UI and optional browser speech input.
- `src/lib/` contains calculations, validation, and Firebase initialization.
- `src/hooks/useWorkspace.tsx` selects local demo or Firebase operations. Demo persistence uses a versioned local-storage key. Firebase uses the modular SDK, authentication, membership-scoped listeners, batches, transactions, and server timestamps.
- `src/services/demo/fixtures.ts` contains linked records for construction and college facilities. Modules use the same organization/site model for both industries.

## Firestore paths

| Path | Access and purpose |
| --- | --- |
| `users/{uid}/memberships/{orgId}` | Server-controlled `organizationId`, `organizationName`, `workerId`, `role`, `active`; readable by that UID only |
| `organizations/{orgId}` | Industry, currency, overtime/rest policy; member read only |
| `organizations/{orgId}/sites/{siteId}` | Site or department; member read, admin write |
| `organizations/{orgId}/workers/{workerId}` | Worker profile and rate; managers read, worker reads own |
| `organizations/{orgId}/shifts/{shiftId}` | Worker/site, title, ISO start/end, status; owner or manager read, manager create/edit/cancel |
| `organizations/{orgId}/attendance/{shiftId}` | One attendance record per shift; owner/manager read and owner check-in/out |
| `organizations/{orgId}/payStatements/{statementId}` | Hours, rates, itemized minor-unit amounts, policy multiplier, status; worker/admin read, admin creates estimate |
| `organizations/{orgId}/safetyReports/{reportId}` | Hazard, reporter, severity, status, pointer to last event |
| `organizations/{orgId}/safetyReports/{reportId}/events/{eventId}` | Server-timestamped status timeline; event must match the parent status transition |
| `organizations/{orgId}/grievances/{grievanceId}` | Confidential content and anonymous flag; anonymous records omit reporter fields |
| `organizations/{orgId}/grievances/{grievanceId}/events/{eventId}` | Server-timestamped review timeline, restricted like the parent |
| `organizations/{orgId}/skills/{skillId}` | Skills/training/certifications and verification state |
| `organizations/{orgId}/auditEvents/{eventId}` | Reserved for a future trusted writer; admin read only, client writes denied |

Authentication UIDs are not record IDs. A membership connects an Auth UID to a worker profile ID. Tenant paths and `organizationId` fields are both checked. Worker directory documents omit wage rates; separate compensation records are visible only to administrators and the linked worker. Timeline subcollections let the client pair parent transitions with server-timestamped events in one batch/transaction.

## Business decisions

- Pay uses integer minor currency units; each statement stores the base rate and multiplier used. Overtime thresholds are organization policy, not legal defaults.
- Shift intervals support overnight scheduling, but production payroll still needs organization timezone and daylight-saving policy.
- Safety and feedback statuses follow explicit transitions enforced in both UI logic and rules. Resolved safety reports can be reopened only by the defined transition.
- Alerts are transparent decision-support signals. There are no quit-risk predictions or automated employment decisions.
- Cloud listeners stay within the selected organization. Worker reads use owner-filtered queries. Event listeners are cleaned up with the parent scope.

## Persistence modes

Only `VITE_APP_MODE=firebase` selects cloud mode. All other settings select isolated demo mode. Missing Firebase config or permission errors stay visible; production-looking workflows do not silently write to demo storage.
