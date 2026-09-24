const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

async function test() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  });

  const waToken = process.env.META_PAGE_ACCESS_TOKEN;
  const waBusinessId = process.env.WA_BUSINESS_ACCOUNT_ID;

  try {
    const { rows } = await pool.query("SELECT * FROM templates WHERE name = 'primary_school_template'");
    const tpl = rows[0];

    const components = [];
    if (tpl.header_format && tpl.header_format !== 'TEXT' && tpl.header_format !== 'NONE') {
      const comp = { type: 'HEADER', format: tpl.header_format };
      if (tpl.header) comp.example = { header_handle: [tpl.header] };
      components.push(comp);
    } else if (tpl.header) {
      components.push({ type: 'HEADER', format: 'TEXT', text: tpl.header });
    }

    const bodyComp = { type: 'BODY', text: tpl.body };
    if (tpl.samples && Array.isArray(tpl.samples) && tpl.samples.length > 0) {
      bodyComp.example = { body_text: [tpl.samples] };
    }
    components.push(bodyComp);
    if (tpl.footer) components.push({ type: 'FOOTER', text: tpl.footer });
    if (tpl.buttons && tpl.buttons.length > 0) {
      components.push({ type: 'BUTTONS', buttons: tpl.buttons });
    }

    console.log(JSON.stringify(components, null, 2));

    const metaRes = await axios.post(
      `https://graph.facebook.com/v18.0/${waBusinessId}/message_templates`,
      {
        name: tpl.name,
        language: tpl.language || 'en',
        category: tpl.category || 'UTILITY',
        allow_category_change: true,
        components,
      },
      { headers: { Authorization: `Bearer ${waToken}` } }
    );
    console.log(metaRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  } finally {
    pool.end();
  }
}
test();
