# Evaluator demo

## Start

```powershell
npm install
npm run dev
```

No credentials are required. The top bar says **Demo data**. Demo records persist only in this browser. Clear local storage for the development origin to restore original fixtures.

## Organizations and personas

Switch Worker, Supervisor, or Administrator persona from the header.

- **Sundar Buildworks** — construction sites: Riverfront Residences and Metro East Link. Arun Kumar, Meena Devi, supervisor Rajesh Nair, shifts, attendance, statements, safety reports, feedback, skills, and a high-priority alert.
- **Vivekananda College** — facilities departments: Housekeeping, Maintenance, Campus support. Priya Selvam, Karthik Ravi, supervisor Latha Krishnan, shifts, statements, several report statuses, anonymous feedback, and credentials.

These personas and records are public evaluator fixtures, not real identity checks. Do not enter real worker information in demo mode.

## Suggested short journey

1. As Arun, open Shifts & attendance and check in/out on a shift.
2. Submit a safety report with a location, severity, and actionable description.
3. Inspect the itemized September pay statement.
4. Switch to Supervisor and advance a high-priority safety report through its permitted states.
5. Switch to Administrator, review derived metrics and alert explanations, then create a shift or draft pay estimate.
6. Switch to Vivekananda College and use the same workflows across facilities departments.
7. Select தமிழ் for translated navigation and core overview labels; typed input remains available if speech recognition is unsupported.

Demo data keys are `karyapulse.demo.data.v1` and `karyapulse.demo.session.v1`. The local demo data never mixes with Firebase records.
