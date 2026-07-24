const fs = require('fs');
let code = fs.readFileSync('controllers/integrationsController.js', 'utf8');
code = code.replace(/OR bsa\.brand_name = c\.business_name OR bsa\.brand_name = c\.client_name/g, '');
fs.writeFileSync('controllers/integrationsController.js', code);
