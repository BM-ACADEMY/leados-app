const axios = require('axios');
require('dotenv').config();

const fileId = '1c_ewznbHfPDBPLhsf1GFEJUbqIJWhhk0';
const internalKey = process.env.INTERNAL_API_KEY || 'leados_internal_2026';
const productionApiUrl = 'https://leados-api.abmgroups.org/api/content/debug/delete-transcode';

async function run() {
  console.log(`Sending deletion request to production API for file ID: ${fileId}...`);
  try {
    const res = await axios.post(productionApiUrl, {
      fileId: fileId
    }, {
      headers: {
        'x-internal-key': internalKey,
        'Content-Type': 'application/json'
      }
    });

    console.log("\n=== Production API Response ===");
    console.log(JSON.stringify(res.data, null, 2));
    if (res.data.success) {
      console.log("\nSUCCESS: Old transcoded video file cleared from production disk.");
      console.log("Now re-queue or publish the post in the dashboard to trigger the new transcode and publish flow.");
    }
  } catch (err) {
    console.error("Failed to delete remote file:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    }
    console.log("\nNOTE: Make sure you have pushed/deployed the code to the production server before running this script!");
  }
}

run();
