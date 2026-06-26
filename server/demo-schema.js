const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados_db',
  user: process.env.DB_USER || 'leados_user',
  password: process.env.DB_PASS || 'LeadOS_DB@2026',
});

async function run() {
  const liveSchemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://leados.bmtechx.com/#organization",
        "name": "LeadOS by BM TechX",
        "url": "https://leados.bmtechx.com",
        "logo": {
          "@type": "ImageObject",
          "inLanguage": "en-US",
          "@id": "https://leados.bmtechx.com/#logo",
          "url": "https://leados.bmtechx.com/logo.png",
          "contentUrl": "https://leados.bmtechx.com/logo.png",
          "width": 512,
          "height": 512,
          "caption": "LeadOS"
        },
        "image": {
          "@id": "https://leados.bmtechx.com/#logo"
        },
        "description": "LeadOS is an enterprise-grade AI operating system built by BM TechX. It unifies CRM, Content Generation, and SEO intelligence into a single, cohesive dashboard for agencies.",
        "founder": {
          "@type": "Person",
          "name": "Admin"
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+1-800-555-0199",
          "contactType": "customer service",
          "areaServed": "US",
          "availableLanguage": ["English"]
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://leados.bmtechx.com/#website",
        "url": "https://leados.bmtechx.com",
        "name": "LeadOS Platform",
        "description": "Enterprise AI CRM and SEO Intelligence",
        "publisher": {
          "@id": "https://leados.bmtechx.com/#organization"
        },
        "inLanguage": "en-US"
      }
    ]
  };

  try {
    await pool.query(`
      INSERT INTO schema_templates (name, schema_type, description, schema_data)
      VALUES ($1, $2, $3, $4)
    `, ['Live BM TechX Organization Graph', 'Organization', 'Comprehensive multi-node Graph for BM TechX LeadOS platform.', JSON.stringify(liveSchemaData)]);
    
    console.log('Live demo schema inserted successfully!');
  } catch (err) {
    console.error('Failed to insert live demo schema', err);
  } finally {
    pool.end();
  }
}

run();
