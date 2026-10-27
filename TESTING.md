# Testing guide

## Commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:rules
```

`npm run test:rules` starts only the Firestore emulator and runs the security tests with an isolated demo project ID. It does not connect to production Firebase.

## Coverage authored

- Unit tests cover overnight and invalid time intervals, recorded hours, regular/overtime splits, minor-unit salary arithmetic, rest intervals, alert generation, date filtering, lifecycle transitions, and Zod input validation.
- A component test covers worker check-in and availability of the corresponding check-out action.
- Rules tests cover own-versus-other salary and compensation reads, owner-filtered queries, cross-worker attendance mutation, membership privilege escalation, tenant isolation, identified and anonymous grievance privacy, atomic safety status timelines, invalid lifecycle transitions, and unauthenticated reads.

## Emulator

`firebase.json` points to `firestore.rules` and `firestore.indexes.json`, with Firestore emulator port 8080. `firebase-tools` and `@firebase/rules-unit-testing` are development dependencies. If port 8080 is occupied, stop the other emulator or update the port and test configuration.

## Known gaps

Tests have been authored but not executed. `npm install` first stopped with `ENOSPC` on the full C: drive; retries after freeing space failed with `ECONNRESET`, and offline installation lacked `@firebase/rules-unit-testing`. There is no `node_modules` or lockfile yet, and the manifest still uses `latest` tags pending verified dependency resolution. The declared typecheck, lint, unit-test, and build commands were attempted and stopped because their executables are missing. `npm run test:rules` was also attempted and stopped because the Firebase CLI is not installed. No emulator-backed end-to-end/browser test is configured. No Lighthouse, bundle, or WCAG measurement has been run. A written test is not evidence that the rules passed; resolve dependencies and execute the commands before deployment.
