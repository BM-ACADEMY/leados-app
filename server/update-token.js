require('dotenv').config();
const db = require('./db/connection');
const cryptoHelper = require('./utils/crypto');

const newToken = "EAAXSTuNdEm8BSD1KiMGnHNBS52cCLQluMNtognVawd2TsKosZCkpPYbpCZC1ZCKtpEGjiQtbbp1uleXCcijYS7RuNFZCNG5cZCqyKQhvZBE7vZB6qo47RI7qbZB5y3KZCyUKRlej05XxKJcGwDzhInN6izZAVy1EXAj1w3Fi0hwUfx6Tz2utULs95Rlu4d88SAcJy7jgZDZD";
const encryptedToken = cryptoHelper.encrypt(newToken);

async function updateTokens() {
  try {
    await db.query(`UPDATE brand_social_accounts SET access_token = $1 WHERE platform = 'facebook'`, [encryptedToken]);
    console.log("Tokens updated in database.");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
updateTokens();
