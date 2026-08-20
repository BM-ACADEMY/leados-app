# 2. Setup and Deployment

## Prerequisites

- Node.js 20 or newer (the current development machine uses Node 22).
- npm.
- PostgreSQL reachable by the backend.
- Meta developer/business assets for WhatsApp and social publishing.
- A configured SMTP/IMAP mailbox for AllianceOS email.
- Optional Google, AI, Razorpay, n8n, and SEO-provider accounts for their respective modules.

## Install

From the repository root:

```powershell
npm.cmd install
Set-Location server
npm.cmd install
```

## Environment files

- Frontend: root `.env`.
- Backend: `server/.env`.

Keep actual values in a password manager. Relevant variable groups include:

| Group | Examples |
|---|---|
| Runtime | `PORT`, `NODE_ENV`, `FRONTEND_URL`, `PORTAL_URL`, `API_BASE_URL` |
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` |
| Authentication | `JWT_SECRET`, `INTERNAL_API_KEY` |
| Frontend | `VITE_API_URL`, `VITE_APP_NAME` |
| Meta/WhatsApp | `META_APP_ID`, `META_BUSINESS_ID`, `WA_VERIFY_TOKEN`, Alliance phone/token variables |
| Alliance email | `ALLIANCE_EMAIL_*` SMTP/from/reply settings |
| AI | provider API keys and model configuration variables |
| Google | OAuth client IDs/secrets, callbacks, service integrations |
| n8n | webhook URLs and workflow authentication configuration |

Never commit `.env`. Rotate all current credentials during handover.

## Local development

Backend:

```powershell
Set-Location server
npm.cmd run dev
```

Frontend in a separate terminal:

```powershell
npm.cmd run dev
```

Typical local URLs are frontend `http://localhost:5173` and API `http://localhost:3600`, but environment configuration is authoritative.

## Database migrations

AllianceOS migrations are SQL files in `server/migrations/`. `server/db/alliance-schema.js` sorts and executes every SQL file when Alliance routes/workers initialize. Therefore every migration must be idempotent: use `IF EXISTS`, `IF NOT EXISTS`, and safe conflict handling.

Before deploying a migration:

1. Back up the database.
2. Read the SQL and determine locks/data updates.
3. Test against a non-production copy.
4. Deploy backend code and restart the backend.
5. Confirm the new constraint/table/index in PostgreSQL.

Do not run all migrations manually against an unknown shared database without confirming the environment and taking a backup.

## Production build

```powershell
npm.cmd run build
```

The output is written to `dist/`. Current builds may warn about large JavaScript chunks and an ineffective `html2pdf.js` dynamic import; these are warnings, not build failures.

## Backend process

The backend starts from `server/server.js`. A process manager configuration exists at `server/ecosystem.config.js`. Confirm the actual production service (PM2, systemd, container, or hosting panel) with infrastructure ownership before restarting.

## Deployment smoke test

- Login works and protected routes load.
- `/api/clients` and `/api/alliance/audiences` respond.
- Leads and prospects paginate correctly.
- WhatsApp number/token health is visible.
- SMTP verification succeeds without sending.
- One internal email test and one consented WhatsApp test succeed.
- Background workers remain running for at least two cycles.
- No migration or worker errors appear in backend logs.
