const fs = require('fs');
let code = fs.readFileSync('controllers/integrationsController.js', 'utf8');
code = code.replace(/if \(field\.name === 'email'\) email = field\.values\[0\];/g, "if (field.name.includes('email')) email = field.values[0];");
code = code.replace(/if \(field\.name === 'phone_number'\) phone = field\.values\[0\];/g, "if (field.name.includes('phone') || field.name === 'contact_number') phone = field.values[0];");
code = code.replace(/if \(field\.name === 'full_name'\) name = field\.values\[0\];/g, "if (field.name.includes('name')) name = field.values[0];");
fs.writeFileSync('controllers/integrationsController.js', code);
