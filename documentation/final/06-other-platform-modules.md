# 6. Mafiya OS and Thedal OS

## Mafiya OS

Mafiya OS supports local-business/GMB operations. Frontend pages are in `src/views/mafiya/`; backend routes are `server/routes/mafiya-*.js`.

| Screen | Purpose |
|---|---|
| The Family | Portfolio/family overview |
| GMB Clients | Local-business onboarding and Google Business configuration |
| Mafiya Plans | Plans and subscription configuration |
| Turf Control | Geographic/keyword territory operations |
| Loyalty (Review) | Reviews, loyalty, and reply workflows |
| Street Posts | Local social/post activity |
| Rival Families | Competitor tracking |
| GBP Insights | Google Business Profile analytics and reports |
| Citation | Citation discovery/tracking |
| Mafia Orders | Operational order tracking |
| Don's Brain | Mafiya/GMB knowledge configuration |
| Usage | Usage and entitlement reporting |

### Mafiya operating guidance

- Confirm the correct GMB client before any write or publish operation.
- OAuth location/account IDs must match the client.
- Review replies and generated posts require human review.
- Treat coordinates, keywords, plans, and client type as configuration—not disposable UI data.
- Check provider errors and cached-data timestamps before reporting a feature as broken.

## Thedal OS

Thedal is the SEO toolset under `/thedal/*`. Frontend pages are in `src/views/thedal/`; backend routes are `server/routes/thedal-*.js`.

Major capabilities include client onboarding/plans, keyword tracking, Google Search Console intelligence, on-page audit, content factory, monthly reporting, rank-drop alerts, SERP radar, gap analysis, schema library, competitor analysis, backlinks, citations, and local SEO bridge.

### Thedal operating guidance

- Ensure a client and plan exist before running plan-gated tools.
- Verify Google OAuth/callback configuration for GSC/local integrations.
- External SEO data providers can rate-limit or bill per request; confirm quotas before bulk operations.
- Preserve raw provider responses/logs when investigating ranking discrepancies.
- Generated content/schema recommendations require review before publishing to a client website.
