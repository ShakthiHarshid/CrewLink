# KaryaPulse

KaryaPulse is a workforce trust and safety workspace for construction sites and college facilities teams. It brings shifts, attendance, wage statements, safety reporting, confidential feedback, skills, and operational signals into one responsive app.

## Local demo

Set `VITE_APP_MODE=demo` to use the local evaluator. The checked-in `.env.example` defaults to demo mode. Switch between Sundar Buildworks (construction) and Vivekananda College (facilities), then switch Worker, Supervisor, and Administrator personas. Records persist in this browser's local storage; clear the app origin's local storage to restore fixtures. Persona selection is a demo convenience, not a security boundary.

## Install and run

Prerequisites: Node.js 20.19+ and npm 10+.

```powershell
npm install
npm run dev
```

Run checks:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:rules
```

## Features

- Personal shifts, check-in/check-out, hours, manager scheduling/edit/cancel.
- Itemized pay statements and draft estimate calculations using integer currency minor units.
- Safety and confidential feedback workflows with lifecycle timelines.
- Skill passport submission and manager verification.
- Organization/site views for construction and college facilities.
- Derived dashboard metrics, configurable threshold alerts, English/Tamil core labels, and optional browser speech-to-text.
- Persistent local demo data or modular Firebase Authentication and Firestore mode.

## Firebase mode

1. Create a Firebase project and web app; enable Email/Password Authentication and create a Firestore database.
2. Set `VITE_APP_MODE=firebase` and fill in the public Firebase web config values in the ignored `.env.local` file. This workspace has a local config for project `crewlink-31ca3`. Never put Admin credentials in `VITE_*` variables.
3. Review and deploy `firestore.rules` and `firestore.indexes.json` to the intended project.
4. Provision organizations, sites, worker profiles, and memberships using trusted Admin SDK tooling. See [SECURITY.md](SECURITY.md) and the `scripts/provision-membership.mjs` script.

```powershell
npm run provision:membership -- <auth-uid> <organization-id> <worker-profile-id> <worker|supervisor|admin>
```

The script uses Application Default Credentials from a trusted administrator machine. Firebase mode has no open registration or self-service role assignment. Analytics initializes only in browsers where Firebase reports support. Test rules with the local emulator using `npm run test:rules`; it does not connect to production.

## Project map

- `src/app/`: routes and responsive shell.
- `src/features/`: workflow screens.
- `src/lib/`: calculations, Firebase initialization, and validation.
- `src/hooks/useWorkspace.tsx`: demo and cloud data operations.
- `src/services/demo/fixtures.ts`: linked sample records for both industries.
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`: Firebase access and emulator configuration.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md), [TESTING.md](TESTING.md), and [TASKS.md](TASKS.md).

## Product boundaries

This MVP does not claim legal wage compliance, verified location, emergency dispatch, or universal speech recognition. QR check-in, image uploads, supervisor attendance corrections, custom analytics backend aggregates, Cloud Functions, automated retention, and self-service onboarding are not implemented. Verification results and known gaps are tracked in `TASKS.md`.
