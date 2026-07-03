const axios = require('axios');

(async () => {
  try {
    const res = await axios.post('http://localhost:3600/api/whatsapp/send', {
      lead_id: 8,
      message: 'Test from script'
    }, {
      headers: {
        'x-data-mode': 'live' // bypassed auth if auth middleware isn't strictly enforcing, wait, let's see.
      }
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.response?.status, e.response?.data || e.message);
  }
})();
