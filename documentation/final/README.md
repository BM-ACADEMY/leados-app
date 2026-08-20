# LeadOS Platform — Final Handover Documentation

Prepared as the technical and operational handover for the current LeadOS repository.

## Start here

1. [System overview](01-system-overview.md)
2. [Setup and deployment](02-setup-and-deployment.md)
3. [LeadOS user guide](03-leados-user-guide.md)
4. [AllianceOS guide](04-allianceos-guide.md)
5. [Content OS guide](05-content-os-guide.md)
6. [Mafiya OS and Thedal OS](06-other-platform-modules.md)
7. [Database, APIs, and background workers](07-technical-reference.md)
8. [Operations and troubleshooting](08-operations-and-troubleshooting.md)
9. [Final handover checklist](09-handover-checklist.md)

## Repository locations

| Area | Location |
|---|---|
| React frontend | `src/` |
| Express backend | `server/` |
| Primary backend entry | `server/server.js` |
| AllianceOS routes | `server/routes/alliance*.js` |
| AllianceOS migrations | `server/migrations/` |
| AllianceOS workers | `server/services/alliance-*.js` |
| Shared frontend API client | `src/services/api.js` |
| Application routing | `src/App.jsx` |
| Sidebar navigation | `src/components/layout/Sidebar.jsx` |
| Existing historical docs | `documentation/` |

## Important security note

This documentation intentionally lists environment-variable names but never secret values. Before handing over access, rotate database passwords, JWT secrets, Meta tokens, email passwords, AI keys, Google credentials, payment secrets, and internal API keys. Do not send `.env` through chat or email.

## Current verification commands

```powershell
npm.cmd run build
node --check server\server.js
```

The repository does not currently have a complete automated backend test suite. Production changes therefore require a build, syntax checks, database migration review, and a manual smoke test of the affected workflow.
