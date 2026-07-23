const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const { runCheckForBusiness } = require('./services/citations/citation.service');

async function test() {
  try {
    console.log('Running test scan with Claude-updated scraper configurations...');
    const result = await runCheckForBusiness(9);
    console.log('Scan completed successfully!');
    console.log('Scan Details:', JSON.stringify(result.scan, null, 2));
    console.log('Results:', JSON.stringify(result.results, null, 2));
  } catch (err) {
    console.error('Scan failed:', err);
  }
}

test();
