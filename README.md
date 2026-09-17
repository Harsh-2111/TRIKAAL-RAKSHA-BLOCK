# RAKSHA-BLOCK

AI-assisted block planning and corridor maintenance coordination for Indian Railways.

RAKSHA-BLOCK gives Engineering, S&T, and TRD departments a shared workspace to request track, traffic, and power maintenance blocks. Section Controllers get a single dashboard to review, bundle, approve, and publish coordinated schedules, with a constraint-solver co-pilot that finds safe, non-conflicting combinations.

Live demo: https://raksha-block-trikaal.vercel.app/

## Table of Contents

- [Why RAKSHA-BLOCK](#why-raksha-block)
- [Data Status](#data-status)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Login Credentials](#login-credentials-demo)
- [Application Workflow](#application-workflow)
- [Enabling Cross-Device Supabase Sync](#enabling-cross-device-supabase-sync)
- [Cross-Device Testing](#cross-device-testing)
- [Project Structure](#project-structure)
- [Security Notes](#security-notes)
- [Roadmap Ideas](#roadmap-ideas)

## Why RAKSHA-BLOCK

Coordinating engineering blocks across departments is often a manual process involving paper requests, phone calls, and spreadsheets. This makes it difficult to identify work that could safely share one block window instead of taking the section twice.

RAKSHA-BLOCK digitizes the request, review, approval, execution, and clearance pipeline. Its optimizer proposes bundled windows that can reduce total traffic block time while giving controllers a clear, auditable trail.

## Data Status

All datasets included with this application are synthetic and simulated. They are provided for demonstration, development, and verification only and are not live Indian Railways production data. Train timetables, corridor capacities, defects, requests, map coordinates, impact estimates, and demo user profiles must not be used for operational railway decisions.

## Key Features

### Department Officers

- Submit structured block requests with section, chainage, line type, work category, machinery, requested date and time, and priority.
- View calculated train-impact estimates, based on the synthetic request and timetable data, including projected passenger delay, rerouted trains, freight delay, and freight trains held.
- Track request status: Pending, Approved, Modified & Approved, Rejected, or Completed.
- Complete post-block safety checkout and clearance.
- Discover shadow-block opportunities where another request could be completed during the same window.

### Section Controllers

- Review pending and active requests from Engineering, S&T, and TRD in one dashboard.
- Approve, modify, or reject requests with a reasoned audit trail.
- Use the AI Co-Pilot for night-shift suggestions, temporary speed restriction attachments, and bundling opportunities.
- Use the AI Optimizer to find compatible request bundles and report the time saved versus running them separately.
- View the day's schedule in an interactive Gantt chart.
- Monitor zonal activity on an analytics map populated from synthetic request and corridor data.
- Publish coordinated, multi-department schedules.
- Receive in-app notifications and audio alerts for new or urgent requests.

### Platform-wide

- Optional Supabase realtime synchronization across devices, with five-second polling as a fallback when Supabase credentials and realtime setup are configured.
- Responsive layouts for desktop and mobile control-room devices.
- Zone and division context for Indian Railways zones including NR, WR, CR, ER, and SR.
- CSV exports and PDF report generation.

The frontend is a single-page React application. Department and admin dashboards are different views over the same local or Supabase-backed `block_requests` data. The CP-SAT service in `server/cp_sat_server.py` uses Google OR-Tools to propose bundles with compatible sections, dates, line types, machinery, and adjacent time windows. The ML risk badge uses the ML API when it is running and falls back to a deterministic local calculation when it is unavailable.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Maps | Leaflet |
| Charts / Gantt | Custom React components |
| PDF / CSV export | jsPDF, html2canvas |
| Authentication | bcryptjs-hashed demo role credentials |
| Realtime data | Supabase PostgreSQL and Realtime |
| Optimization engine | Python and Google OR-Tools CP-SAT |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18 or later and npm
- Python 3.10 or later and pip

### Installation

```bash
npm install
pip install -r requirements.txt
```

### Run All Local Services

Run each command in a separate terminal from the repository root. Keep all three terminals running:

```bash
# Terminal 1: CP-SAT optimizer service on port 8000
npm run cp-sat

# Terminal 2: ML risk scoring API on port 8001
python src/ml/api_server.py

# Terminal 3: Vite frontend on port 3000
npm run dev
```

The services are available at `http://localhost:8000`, `http://localhost:8001`, and `http://localhost:3000`. Open the frontend at http://localhost:3000/.

The ML API loads the optional `models/defect_priority_lgb.pkl` artifact when present and otherwise serves its deterministic fallback. The Gemini Co-Pilot chat uses the server-side `GEMINI_API_KEY` and optional `GEMINI_MODEL` environment variables. `VITE_GEMINI_API_KEY` is accepted temporarily for existing deployments, but should be migrated to `GEMINI_API_KEY` because `VITE_` values are intended for browser exposure.

## Environment Variables

Copy `.env.example` to `.env` and fill in your own values before deploying. Supabase credentials are required at runtime. The ML risk scoring API uses port `8001`, while the CP-SAT solver uses port `8000`.

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server on port 3000 |
| `npm run cp-sat` | Start the Python CP-SAT optimizer service on port 8000 |
| `python src/ml/api_server.py` | Start the ML risk scoring API on port 8001 |
| `npm run build` | Type-check and build the production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run TypeScript type checking with `tsc --noEmit` |
| `npm run clean` | Remove `dist/` and `server.js` |

## Login Credentials (Demo)

| Portal | Username | Password |
|---|---|---|
| Engineering | `eng` | `eng@1234` |
| S&T | `st` | `st@1234` |
| TRD | `trd` | `trd@1234` |
| Admin / Section Controller | `admin` | `admin@1234` |

## Application Workflow

1. Sign in with one of the demo credentials above.
2. Department officers create and submit block requests.
3. The Section Controller reviews requests from all departments.
4. The controller approves, modifies, rejects, or runs the AI Co-Pilot and CP-SAT optimizer.
5. Compatible requests can be bundled into a coordinated schedule.
6. The controller publishes the approved schedule.
7. Department officers complete safety clearance after an approved block is finished.
8. When configured, Supabase realtime updates and five-second polling synchronize requests, decisions, schedules, notifications, and safety updates across clients.

## Enabling Cross-Device Supabase Sync

Run [`supabase/realtime_setup.sql`](supabase/realtime_setup.sql) once in the Supabase Dashboard SQL Editor. It:

- Adds `block_requests` to the `supabase_realtime` publication.
- Adds the read/write RLS policies required by the current anon-key demo login.

Reload both devices after running the script. New requests and controller decisions can arrive through Realtime, with five-second polling as a recovery path if a Realtime event is missed. This still operates on the application's synthetic/demo data unless connected to a separately managed dataset.

## Cross-Device Testing

1. Open the application on both a laptop and a mobile device.
2. Log in as a department officer on one device and as Admin on the other.
3. Submit a request from the department device.
4. Approve or reject it from the Admin device.
5. Confirm that the status updates on the department device without a page refresh.

## Project Structure

```text
RAKSHA-BLOCK-TRIKAAL-main/
├── public/                      # Static assets
├── server/
│   └── cp_sat_server.py         # OR-Tools CP-SAT optimizer service
├── src/
│   ├── components/              # Dashboards, modals, charts, and maps
│   ├── data/                    # Zone, division, and mock data
│   ├── lib/
│   │   └── supabase.ts          # Supabase client and data helpers
│   ├── utils/                   # Alerts, solver, exports, and PDF helpers
│   ├── types.ts                 # Shared TypeScript domain types
│   └── App.tsx                  # Top-level application logic
├── supabase/
│   └── realtime_setup.sql       # Realtime and RLS setup script
├── requirements.txt             # Python dependencies
├── vercel.json                  # Vercel build configuration
└── vite.config.ts
```

## Security Notes

This is currently a demo-grade deployment, not a production-hardened system:

- All bundled application data is synthetic/demo data; this repository is not connected to Indian Railways production systems.
- Demo login credentials are static and shared by role rather than by individual user.
- `src/lib/supabase.ts` requires the Supabase URL and anon key through environment variables and does not include credential fallbacks.
- The RLS policies in `supabase/realtime_setup.sql` are intentionally permissive for demo purposes. Use Supabase Auth and department claims to enforce per-department access in production.
- Migrate the current demo role credentials to Supabase Auth before handling operational data.

## Roadmap Ideas

- Migrate demo logins to Supabase Auth with per-department RLS.
- Persist AI Co-Pilot and CP-SAT decisions with a full audit history.
- Add role-based notification preferences.
- Expand the optimizer to support multi-day recurring maintenance windows.

## Links

- Live app: https://raksha-block-trikaal.vercel.app/
- Vercel project: https://vercel.com/harsh-2111s-projects/raksha_block_trikaal

RAKSHA-BLOCK: coordinated corridor maintenance without the phone tag.
