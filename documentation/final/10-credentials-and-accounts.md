# 10. Credentials and Account Handover

> **RESTRICTED — CONFIDENTIAL**
>
> This document contains production credentials, infrastructure access, API-account access, WhatsApp identifiers, and banking information. Limit access to authorized company owners. Store it in an approved encrypted password manager and rotate every password immediately after handover.

## Meta Business Suite

- Website: https://business.facebook.com/
- Login: `mohamedsalavudeen19@gmail.com`
- Password: `Salav@123`

## Meta for Developers

- Website: https://developers.facebook.com/
- Login: `mohamedsalavudeen19@gmail.com`
- Password: `Salav@123`

## n8n

- Website: https://leados-n8n.abmgroups.org/
- Email: `admin@abmgroups.org`
- Password: `Bmtechx@2025`

## LeadOS Production Application

- Website: https://leados-app.abmgroups.org/
- Email: `admin@abmgroups.org`
- Password: `Bmtechx@2025`

## Google Cloud Console

- Website: https://console.cloud.google.com/
- Email: `bmacademypondy@gmail.com`
- Password: `Admin@2025`

## OpenRouter

- Website: https://openrouter.ai/
- Email: `bmacademypondy@gmail.com`
- Password: `Admin@2025`
- API keys: Retrieve and rotate them separately during handover.

## GitHub

- Website: https://github.com/
- Email: `teamkamarweb@gmail.com`
- Password: `TeamKamar@123`
- Repository: https://github.com/BM-ACADEMY/leados-app.git

## ValueSERP

- Website: https://app.valueserp.com/login
- Email: `bmacademypondy@gmail.com`
- Password: `Admin@2025`

## WhatsApp Business

- WABA account ID: `953749850406150`
- LeadOS WhatsApp number: `99445 09441`
- AllianceOS WhatsApp number: `99442 88271`

## Razorpay and Settlement Account

### Razorpay login

- Email: `samsudeenbm05@gmail.com`
- Password: `Sam@2025`

### Settlement bank account

- Company name: `BEZOOZ EDTECH`
- Account number: `10239568795`
- IFSC: `IDFB0080134`
- SWIFT code: `IDFBINBBMUM`
- Bank: `IDFC FIRST`
- Branch: `PONDICHERRY BRANCH`

## Zoho Mail

- Website: https://www.zoho.com/mail/login.html
- Email: `admin@abmgroups.org`
- Password: `Bmtechx@2025`

## PostgreSQL Production Database

```dotenv
DB_HOST=leados-api.abmgroups.org
DB_PORT=5432
DB_NAME=leados_db
DB_USER=leados_user
DB_PASS=LeadOS_DB@2026
```

## Mandatory Handover Actions

- Transfer every account to a company-controlled email address.
- Enable multi-factor authentication on every supported account.
- Replace shared passwords with unique passwords stored in the company password manager.
- Rotate the PostgreSQL password and update the production environment securely.
- Rotate API tokens separately; changing a login password may not invalidate existing tokens.
- Review Meta, Google Cloud, GitHub, Razorpay, and n8n members and remove former users.
- Confirm all recovery email addresses and phone numbers belong to the company.
- After verification, remove this plaintext document from the repository.

## Rotation Record

| System | New owner | MFA enabled | Password/token rotated | Verified date | Notes |
|---|---|---:|---:|---|---|
| Meta Business and Developers |  |  |  |  |  |
| n8n |  |  |  |  |  |
| LeadOS |  |  |  |  |  |
| Google Cloud |  |  |  |  |  |
| OpenRouter |  |  |  |  |  |
| GitHub |  |  |  |  |  |
| ValueSERP |  |  |  |  |  |
| Razorpay |  |  |  |  |  |
| Zoho Mail |  |  |  |  |  |
| PostgreSQL |  |  |  |  |  |
