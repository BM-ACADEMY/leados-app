const axios = require('axios');
require('dotenv').config();

async function test() {
  const waToken = process.env.META_PAGE_ACCESS_TOKEN;
  const waBusinessId = process.env.WA_BUSINESS_ACCOUNT_ID;

  try {
    const metaRes = await axios.post(
      `https://graph.facebook.com/v18.0/${waBusinessId}/message_templates`,
      {
        name: 'test_template_123',
        language: 'en',
        category: 'MARKETING',
        allow_category_change: true,
        components: [
          {
            type: 'BODY',
            text: "Hello {{1}}, test {{2}}",
            example: { body_text: [ ["sample1", "sample2"] ] }
          }
        ]
      },
      { headers: { Authorization: `Bearer ${waToken}` } }
    );
    console.log(metaRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}
test();
