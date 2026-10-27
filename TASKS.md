# KaryaPulse implementation checklist

Starting state: no application source or package configuration was present. The repository contained Git metadata and an untracked `desktop.ini`, which was left untouched. Node 24.22.1, npm 11.19.1, and Git 2.56.0 are available.

## Phase 1 — Discovery and foundation
- [x] Inspect repository, Git state, runtime, and package manager.
- [x] Configure Vite, React, strict TypeScript, Tailwind v4, ESLint, Vitest, metadata, and responsive shell.
- [ ] Confirm clean dependency install, development server, and production build (blocked by local disk exhaustion, then registry connection resets during retry).

## Phase 2 — Data and identity
- [x] Define typed organization, worker, shift, attendance, pay, safety, grievance, and skill records.
- [x] Separate persistent demo fixtures from Firebase mode.
- [x] Add Firebase email/password authentication and membership-scoped Firestore listeners and writes.
- [x] Add restrictive tenant, role, ownership, salary, anonymous feedback, and lifecycle rules.
- [x] Keep hourly rates out of supervisor-readable worker profiles by separating compensation records.
- [x] Add indexes, emulator configuration, and a trusted membership-provisioning script.
- [ ] Run Firestore rules tests in the emulator.
- [ ] Add Cloud Functions for broader provisioning, retention, aggregates, and trusted audit services.

## Phase 3 — Core worker workflows
- [x] Personal shifts, check-in/out, and manager scheduling, editing, and cancellation.
- [x] Itemized wage statements and admin draft estimates using integer minor currency units.
- [x] Safety reports and server-timestamped cloud status event timelines.
- [x] Identified/anonymous feedback and cloud status timelines.
- [x] Skill passport submission and manager verification.
- [x] English/Tamil core labels and optional browser speech-to-text with typed fallback.
- [ ] QR attendance, secure image upload, location verification, and supervisor-assisted attendance edits.

## Phase 4 — Employer workflows
- [x] Construction and college organizations, sites, and departments in demo fixtures.
- [x] Manager worker-profile creation and shift scheduling.
- [x] Safety and feedback review lifecycle.
- [x] Derived metrics and rule alerts for missing check-outs, high hours, short rest, shift overlap, and unresolved high-severity hazards.
- [ ] Organization/site creation UI, coverage targets, aggregate turnover indicators, and server-side analytics for large tenants.

## Phase 5 — Verification
- [x] Add unit tests for time, overtime, wages, alert logic, date filtering, validation, and lifecycle transitions.
- [x] Add a worker attendance workflow component test.
- [x] Add Firestore authorization tests for salary ownership, tenant isolation, attendance, role escalation, anonymity, invalid transitions, and unauthenticated access.
- [ ] Run typecheck, lint, tests, emulator rules tests, and production build (scripts currently stop because dependencies are not installed).
- [ ] Measure accessibility, performance, and bundle size.

## Phase 6 — Finalization
- [x] Add README, security, testing, architecture, demo, and task documentation.
- [x] Document Firebase setup, emulators, indexes, rules, and trusted role provisioning.
- [ ] Verify clean install and evaluator journeys on a machine with sufficient free disk.

## Environment blocker and known gaps

- `npm install` first failed with `ENOSPC` while writing the npm cache when C: had 0 bytes free. After reclaiming only cache files created by that attempt, online installation retries failed with `ECONNRESET`; an offline retry stopped at a package missing from cache (`@firebase/rules-unit-testing`). No `node_modules` or `package-lock.json` was produced.
- The manifest currently uses `latest` tags because package resolution could not reach the registry. Replace these with verified, compatible versions and generate/commit the lockfile as soon as installation is available. Typecheck, lint, unit/rules tests, and build have not passed: their commands currently stop with missing tool executables.
- Firebase was not configured or deployed. No cloud records or rules were run against a live project.
- Demo mode is simulated, local to one browser, and not a security boundary.
- Anonymous cloud feedback deliberately has no reporter identity, so its submitter cannot track it later or across devices.
- There is no automated retention/deletion job, export workflow, audit event writer, Cloud Functions deployment, or disaster recovery plan.
- The app does not collect/verify location, use QR check-in, upload images, or allow supervisor attendance corrections. Device-local date/time display must be paired with an organization timezone/pay policy before payroll production use.
- Cloud mode requires trusted pre-provisioning of organizations, sites, worker profiles, and memberships. Self-registration and self-service role assignment are not implemented.
- No emergency dispatch, legal compliance, formal security review, accessibility audit, or certification is claimed.
