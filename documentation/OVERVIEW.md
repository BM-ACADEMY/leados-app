# LeadOS - Technical Overview

## What is LeadOS?

LeadOS is a comprehensive lead management and automation platform built by BM TechX for ABM Groups. It serves as a central hub for managing leads, automating sales workflows, coordinating marketing campaigns, and providing SEO and local business management tools.

---

## Architecture Summary

### Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, React Router DOM |
| Backend | Node.js, Express 5.2, Socket.io |
| Database | PostgreSQL |
| Real-time | Socket.io |

### Project Structure
```
leados-portal/
├── src/                    # React Frontend
│   ├── views/              # Page components (40+ views)
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React Context providers
│   ├── services/           # API client
│   └── constants/          # Theme & configuration
├── server/                 # Node.js Backend
│   ├── routes/             # API route handlers (40+ files)
│   ├── controllers/        # Business logic
│   ├── db/                 # Database connection
│   └── services/           # External API integrations
├── contentOS/              # Content OS module
└── documentation/          # This folder
```

---

## Core Modules

### 1. SalesOS (Lead Management)
- Lead capture, tracking, and conversion
- WhatsApp integration for messaging
- Sales dashboard with revenue metrics
- Sales tasks and follow-up management

### 2. Alliance OS (Partner Network)
- Partner collaboration and lead sharing
- Pipeline management
- Alliance inbox for communication
- Knowledge base and prompt management

### 3. Content OS (Social Media Automation)
- AI-powered content generation
- Multi-platform publishing (Facebook, Instagram, LinkedIn, YouTube)
- Content approval workflows
- Google Drive folder monitoring

### 4. Thedal SEO Suite
- Client onboarding and management
- Keyword tracking
- Google Search Console integration
- On-page audits and content factory
- Monthly reporting
- Competitor analysis
- Backlink tracking

### 5. Mafiya (Local Business Tools)
- Google Business Profile management
- Review monitoring and responses
- Post publishing
- Citation tracking
- Loyalty programs

---

## API Endpoints Structure

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Password update

### Leads & Messages
- `GET/POST /api/leads` - Lead CRUD
- `GET/POST /api/inbox` - Conversations
- `POST /api/whatsapp/send` - Send messages

### Clients & Brands
- `GET/POST /api/clients` - Brand management
- `GET /api/thedal/clients` - SEO clients
- `GET /api/mafiya/clients` - Local business clients

### Content
- `GET/POST /api/content` - Content items
- `POST /api/content/approve` - Approval workflow
- `POST /api/content/publish` - Publishing

### Reports & Analytics
- `GET /api/reports/summary` - Dashboard stats
- `GET /api/reports/revenue-today` - Revenue metrics
- `GET /api/reports/lead-sources` - Lead attribution

---

## Database

- **PostgreSQL** with connection pooling
- **Key Tables**: users, leads, conversations, messages, clients
- **Module Tables**: content_*, thedal_*, mafiya_*, alliance_*

---

## Key Features

| Feature | Technology |
|---------|------------|
| Real-time messaging | Socket.io |
| AI content generation | OpenAI, Groq, Google Gemini |
| WhatsApp messaging | Meta Business API |
| SEO analytics | Google Search Console, Google Analytics |
| GBP management | Google Business Profile API |
| File uploads | Multer |
| Scheduled tasks | node-cron |
| Email notifications | Nodemailer |

---

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3600
```

### Server (.env)
```
PORT=3600
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
JWT_SECRET
META_PAGE_ACCESS_TOKEN
OPENAI_API_KEY
GOOGLE_ANALYTICS_PROPERTY_ID
# ... many more
```

---

## Running the Application

### Frontend
```bash
npm run dev     # Development server
npm run build   # Production build
```

### Backend
```bash
cd server
npm run dev     # Development with nodemon
npm start       # Production
```

---

## Quick Reference

- **Frontend Port**: 5173 (Vite dev)
- **Backend Port**: 3600 (default)
- **API Base URL**: Configured in .env
- **Auth**: JWT tokens (7-day expiry)
- **Data Mode**: Supports 'live' and 'demo' modes

---

## File Locations

| Function | Location |
|----------|----------|
| Main App Router | `src/App.jsx` |
| API Client | `src/services/api.js` |
| Auth Hook | `src/hooks/useAuth.js` |
| Client Context | `src/contexts/ClientContext.jsx` |
| Server Entry | `server/server.js` |
| DB Connection | `server/db/connection.js` |
| Route Definitions | `server/routes/*.js` |

---

*Generated: July 2025*
*Project: LeadOS Portal*
*Organization: ABM Groups - Powered by BM TechX*
