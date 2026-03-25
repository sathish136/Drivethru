# Post Office Attendance Management System

## Overview

A full-stack HR Attendance Management System for Sri Lanka Post with 50+ branches.
Green-themed professional HRMS application similar to OrangeHRMS.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/attendance)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **State management**: TanStack React Query (auto-generated hooks)
- **Icons**: Lucide React
- **Charts**: Recharts

## Theme

Primary color: Green (#5db75c / HSL 119 41% 54%)
Small compact font (text-xs, text-sm)
Dark sidebar, clean white content area

## Features

### Modules
1. **Dashboard** - Real-time stats, branch-wise summary, recent attendance
2. **Today's Attendance** - Live attendance status, punch in/out per employee
3. **Monthly Sheet** - Excel-like grid (employees × days) with color-coded status
4. **Attendance Approvals** - Review and approve/reject manually-entered punch records (`/attendance/approvals`)
5. **Shift Management** - Normal shift and split shift support
   - Normal: In1→Out1=Total
   - Split: In1→Out1=H1 | In2→Out2=H2 | Total=H1+H2
6. **Employee Management** - Full CRUD, biometric ID, branch assignment
7. **Branch Management** - 3-level hierarchy (Head Office → Regional → Sub-branch)
8. **Payroll Settings** - Statutory contributions, OT multipliers per type (regular, off-day, poya, public holiday), off-season mode, housing tiers, allowances
9. **HR Settings** - Work time policy, OT grace, deduplication, OT-exempt designations, department rules, lunch rules
10. **Leave Balances** - Annual & casual leave tracking, 1.5 days/week accrual, manual override (`/leave-balances`)
11. **Reports** - Attendance, monthly, overtime reports
12. **Biometric Devices** - ZKTeco ZK Push ADMS setup, device management, push logs
13. **User Management** - Role-based access (super_admin, regional_admin, branch_admin, viewer)
14. **Settings** - Organization config, ZK Push setup, holiday management
15. **Incentives** - Per-employee incentive management (performance, attendance, festival, lunch, other bonuses). CRUD with status workflow (pending → approved → paid), summary cards, type breakdown, filters by month/year/type/status (`/incentives`)

### Attendance Status Colors
- Present (P): green
- Absent (A): red
- Late (L): amber/orange
- Half Day (HD): yellow
- Leave (LV): purple
- Holiday (H): gray

## Branch Hierarchy

- 1 Head Office (Head Office - Colombo)
- 14 Regional Offices
- Sub-branches under each regional

## Demo Logins

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Super Admin (all access) |
| western | western123 | Regional Admin (Western region) |
| viewer | viewer123 | Viewer (Head Office only) |

## Seeded Data

- 124 active employees across 24 branches
- 2000 attendance records (30 days history)
- 3 shifts (Morning, Day, Split Shift A)
- 5 national/religious holidays

## Structure

```text
artifacts/
├── attendance/          # React+Vite frontend (port 18763, preview path /)
│   └── src/
│       ├── pages/       # Dashboard, attendance, employees, branches, reports, biometric, users, settings
│       ├── components/  # Layout sidebar, UI components
│       └── hooks/       # API hooks (use-attendance, use-employees, use-core)
└── api-server/          # Express 5 backend (port 8080, path /api)
    └── src/
        ├── routes/      # auth, branches, employees, shifts, attendance, reports, biometric, users, settings, holidays
        └── lib/         # auth (session-based), helpers

lib/
├── db/src/schema/       # branches, employees, shifts, attendance, biometric, users, settings
├── api-spec/            # OpenAPI 3.1 spec (openapi.yaml)
├── api-client-react/    # Generated React Query hooks
└── api-zod/             # Generated Zod schemas

scripts/src/seed.ts      # Database seeder
```

## ZK Biometric Push Setup

ZKTeco ADMS Configuration in device:
- Server: your-domain.com
- Port: 80
- Endpoint: /api/biometric/push
- Push method: ZK Push (ADMS)
- Supported models: F18, F19, F21, K40, MA300, UA300, FR1200
