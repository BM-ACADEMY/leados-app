# LeadOS Frontend — API Integration Setup

## Overview
The LeadOS frontend is now connected to the live backend API. Dynamic data flows from your VPS server instead of hardcoded mock data.

## API Configuration

### Base URL
```
https://leados-api.abmgroups.org/
```

### Authentication
- Login credentials are validated against your PostgreSQL database
- JWT tokens are issued on successful login (7-day expiry)
- Tokens are stored in `localStorage` as `leados_token`

## API Files Created

### `/src/services/api.js`
Central API client with all endpoints:
- **Auth**: `login()`, `changePassword()`
- **Leads**: `getLeads()`, `getLead()`, `createLead()`, `updateLead()`
- **WhatsApp**: `sendWhatsAppMessage()`
- **Templates**: `getTemplates()`, `createTemplate()`
- **Campaigns**: `getCampaigns()`, `createCampaign()`
- **Clients**: `getClients()`, `getClient()`
- **Payments**: `createPaymentLink()`, `getPayments()`

### `/src/hooks/useAuth.js`
React hook for user authentication:
```javascript
const { user, login, logout, loading, error } = useAuth();
```

### `/src/hooks/useLeads.js`
React hook for fetching leads with filters:
```javascript
const { leads, total, loading, error, refetch } = useLeads({
  status: 'hot',
  brand: 'BM Academy',
  search: 'Arjun'
});
```

### `/src/hooks/useTemplates.js`
React hook for fetching templates:
```javascript
const { templates, loading, error } = useTemplates();
```

## Key Features

✅ **Live Authentication**: Validates against your backend
✅ **Dynamic Leads Data**: Fetches real leads from PostgreSQL
✅ **Template Management**: Lists approved/pending/rejected templates
✅ **Error Handling**: Shows API errors in UI
✅ **Token Management**: Auto-handles JWT token lifecycle
✅ **Fallback Support**: Falls back to mock data if API unavailable

## Testing the Integration

### Login Test
```
Email: kamar@abmgroups.org
Password: [your_password]
```
(User must exist in your PostgreSQL database)

### API Testing
Use Postman or curl to test endpoints:
```bash
# Get Authorization Token
curl -X POST https://leados-api.abmgroups.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kamar@abmgroups.org","password":"your_password"}'

# Fetch Leads
curl -X GET https://leados-api.abmgroups.org/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment Setup

No additional setup needed—the frontend automatically connects to:
- **API Server**: `https://leados-api.abmgroups.org/`
- **N8N Webhook**: `https://leados-n8n.abmgroups.org/`

## API Endpoints Available

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/leads` | List leads with filters |
| GET | `/api/leads/:id` | Get lead details + conversations |
| POST | `/api/leads` | Create new lead |
| PATCH | `/api/leads/:id` | Update lead status/score |
| POST | `/api/whatsapp/send` | Send WhatsApp message |
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/clients` | List clients (brands) |
| POST | `/api/payments/create-link` | Create Razorpay payment link |
| GET | `/api/payments` | List payments |

## Fallback Behavior

If the API is temporarily unavailable:
- **LeadsView** will display mock data from `mockData.js`
- **TemplatesView** will show fallback templates
- **Error messages** inform users of connectivity issues

## Next Steps

1. ✅ Frontend is connected to `https://leados-api.abmgroups.org/`
2. ✅ Login uses real authentication
3. ✅ Leads are fetched from PostgreSQL
4. Next: Add more endpoints for:
   - Campaigns CRUD
   - Clients management
   - Payment integration
   - Dashboard analytics
   - Real inbox (WebSocket for WhatsApp)

## Support

For API issues, check:
1. Backend logs on VPS: `pm2 logs leados-api`
2. Database connectivity: `psql -U leados_user -d leados_db`
3. CORS headers are configured for your frontend domain
