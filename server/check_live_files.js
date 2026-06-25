const https = require('https');

const urls = [
  'https://leados-api.abmgroups.org/uploads/transcoded_1kuKN6stbypI5Prq1KDWxysUM6nXDlhUN.mp4',
  'https://leados-api.abmgroups.org/uploads/thumbnail_1kuKN6stbypI5Prq1KDWxysUM6nXDlhUN.jpg',
  'https://leados-api.abmgroups.org/uploads/transcoded_1f7UhQ4gKqWgHdYA_A7WPzo3inGbUsz0k.mp4',
  'https://leados-api.abmgroups.org/uploads/thumbnail_1f7UhQ4gKqWgHdYA_A7WPzo3inGbUsz0k.jpg'
];

for (const url of urls) {
  https.get(url, (res) => {
    console.log(`${url} => Status: ${res.statusCode}, Size: ${res.headers['content-length']} bytes`);
  }).on('error', (err) => {
    console.error(`Error for ${url}:`, err.message);
  });
}
