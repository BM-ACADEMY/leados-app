const db = require('../db/connection');

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'do', 'does', 'what', 'how', 'can', 'i', 'you',
  'for', 'of', 'in', 'to', 'with', 'and', 'or', 'please', 'tell', 'me', 'about',
  'this', 'that', 'it', 'your', 'my', 'have', 'has', 'will', 'would', 'be',
]);

function extractKeywords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

const BRAIN_INSTRUCTIONS = 'Only use facts provided in this brand knowledge context — never invent prices, dates, or policies. '
  + 'If a detail needed to answer is missing, blank, "needs_confirmation", or "check with mentor", do NOT guess it. '
  + 'Instead, tell the lead that specific detail will be confirmed by the team, and offer to connect them with a mentor or executive for it.';

// Looks up the brand configured for this audience, matches the inbound
// question against that brand's offerings by keyword, and returns a compact
// context block (brand info + relevant offerings + their FAQs) for the AI
// reply-suggestion prompt. Returns null if no brand is configured yet.
async function getAllianceBrainContext(audience, messageText) {
  if (!audience) return null;
  // Prefer an explicit brand-to-audience link. Older Brain records were created
  // before that selector existed, so fall back to the brand configured on the
  // audience itself. This keeps every AI entry point on the same source of truth
  // without silently ignoring otherwise valid brand knowledge.
  const brandResult = await db.query(
    `SELECT b.*
     FROM alliance_brands b
     LEFT JOIN alliance_audiences a ON a.code=$1
     WHERE b.active=TRUE
       AND (
         b.audience=$1
         OR (b.audience IS NULL AND (
           REGEXP_REPLACE(LOWER(b.code),'[^a-z0-9]','','g')=REGEXP_REPLACE(LOWER(COALESCE(a.brand,'')),'[^a-z0-9]','','g')
           OR REGEXP_REPLACE(LOWER(b.name),'[^a-z0-9]','','g')=REGEXP_REPLACE(LOWER(COALESCE(a.brand,'')),'[^a-z0-9]','','g')
         ))
       )
     ORDER BY (b.audience=$1) DESC,b.id
     LIMIT 1`,
    [audience]
  );
  if (!brandResult.rowCount) return null;
  const brand = brandResult.rows[0];

  const offeringsResult = await db.query(
    `SELECT * FROM alliance_offerings WHERE brand_id = $1 AND status = 'active' ORDER BY name`,
    [brand.id]
  );
  const offerings = offeringsResult.rows;

  const keywords = extractKeywords(messageText);
  const matched = keywords.length
    ? offerings.filter((offering) => {
      const haystack = `${offering.name} ${offering.category || ''} ${offering.offering_code || ''}`.toLowerCase();
      return keywords.some((word) => haystack.includes(word));
    })
    : [];
  // Cap the fallback list so brands with many offerings don't blow out the prompt
  // when the inbound message gives no clear match.
  const relevant = matched.length ? matched : offerings.slice(0, 8);

  let faqsByOffering = {};
  if (relevant.length) {
    const faqResult = await db.query(
      `SELECT * FROM alliance_offering_faqs WHERE offering_id = ANY($1::bigint[]) ORDER BY sort_order, id`,
      [relevant.map((item) => item.id)]
    );
    for (const faq of faqResult.rows) {
      (faqsByOffering[faq.offering_id] ||= []).push({ question: faq.question, answer: faq.answer });
    }
  }

  return {
    brand: {
      name: brand.name,
      description: brand.description,
      phone: brand.phone,
      whatsapp: brand.whatsapp,
      email: brand.email,
      website: brand.website,
      address: brand.address,
      business_hours: brand.business_hours,
      languages: brand.languages,
      target_customers: brand.target_customers,
      primary_contact: brand.primary_contact,
      escalation_contact: brand.escalation_contact,
      escalation_phone: brand.escalation_phone,
      policies: brand.policies,
      verified_by: brand.verified_by,
      last_verified_date: brand.last_verified_date,
    },
    all_offerings: offerings.map((o) => `${o.name}${o.fee ? ` (₹${o.fee})` : ''}`),
    relevant_offerings: relevant.map((o) => ({
      name: o.name,
      code: o.offering_code,
      category: o.category,
      tier: o.tier,
      fee: o.fee,
      duration: o.duration,
      short_description: o.short_description,
      details: o.details,
      faqs: faqsByOffering[o.id] || [],
    })),
    instructions: BRAIN_INSTRUCTIONS,
  };
}

module.exports = { getAllianceBrainContext };
