const http = require('http');

http.get('http://localhost:3500/api/content?status=pending_approval', {
  headers: {
    'Authorization': 'Bearer dummy_token_or_none', // wait, does it require authentication?
    'x-internal-key': 'leados_internal_2026' // Bypass auth via internal key!
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("API Response Items (mapped):", JSON.stringify(json.items?.map(i => ({
        id: i.id,
        brand_name: i.brand_name,
        public_video_url: i.public_video_url,
        thumbnail_url: i.thumbnail_url
      })), null, 2));
    } catch (e) {
      console.log("Raw response (not JSON):", data);
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
