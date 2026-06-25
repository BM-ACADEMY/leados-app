const http = require('http');

http.get('http://localhost:3500/uploads/thumbnail_1f7UhQ4gKqWgHdYA_A7WPzo3inGbUsz0k.jpg', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
}).on('error', (err) => {
  console.error('Error:', err.message);
});
