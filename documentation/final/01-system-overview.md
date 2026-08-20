# 1. System Overview

## Purpose

LeadOS is an internal ABM Groups operations portal. It combines CRM and sales work, WhatsApp communication, campaign templates, AI-assisted knowledge, outbound AllianceOS campaigns, content publishing, local-business operations, and SEO tooling in one React application backed by Node.js and PostgreSQL.

## Architecture

```text
Browser (React + Vite)
        |
        | HTTP / Socket.IO
        v
Node.js + Express (server/server.js)
        |
        +-- PostgreSQL
        +-- Meta WhatsApp / Facebook / Instagram APIs
        +-- Zoho SMTP + IMAP
        +-- Google APIs (Drive, Calendar, Analytics, GSC)
        +-- OpenRouter / OpenAI / Gemini-compatible AI services
        +-- n8n automation endpoints
```

## Main platform areas

### LeadOS core

- Dashboard: operating totals and summaries.
- Leads: lead records, ownership, status, scoring, and creation.
- Sales Task: follow-ups, overdue actions, and unread task count.
- Inbox: human WhatsApp conversations and message actions.
- Campaigns: shared/legacy campaign management.
- Templates: common WhatsApp template library, Meta submission, status sync, variable definitions, and LeadOS/AllianceOS scope.
- AI Brain: brand/client knowledge used by AI features.
- AI Image: image generation tools.
- Reports and Founder Reports: business reporting.
- Clients: authoritative brand/client list and Meta configuration.
- Integrations: external service connections.

### AllianceOS

Outbound prospecting and reply management for email and consented WhatsApp. It includes dynamic audiences, spreadsheet import, suppression checks, email campaigns, WhatsApp campaigns, automated reminders, replies, prompts, AI Brain data, sender configuration, and campaign analytics.

### Content OS

Content approval and publishing operations: Approval Room, Folder Monitors, Scheduler, Caption Studio, Thumbnail Brain, Social Accounts, Token Health, Publish Logs, Reach Report, and Failed Jobs.

### Mafiya OS

Local-business/GMB operations: The Family, GMB Clients, plans, geographic turf, reviews/loyalty, street posts, competitors, GBP insights, citations, orders, knowledge, and usage.

### Thedal OS

SEO-oriented tooling under `/thedal/*`, including clients, plans, keyword tracking, GSC intelligence, audits, content factory, reports, rank alerts, SERP radar, gap hunting, schema, competitor research, backlinks, citations, and local SEO bridge.

## Authentication and authorization

The frontend stores the authentication token under `leados_token`. The shared API client attaches it to requests. Backend protected routes use the project authentication middleware. Access control should be reviewed before exposing this portal outside the internal environment.

## Source-of-truth conventions

- Clients/brands: `clients` and `/api/clients`.
- Alliance audiences and columns: `alliance_audiences` and `alliance_audience_fields`.
- Alliance campaign-specific email copy: `alliance_campaign_templates`.
- Shared WhatsApp templates: `templates`.
- Alliance prospect records: `alliance_prospects`.
- Application routes: `src/App.jsx`.
- Runtime API URL: `VITE_API_URL`.
