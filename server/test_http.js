const axios = require("axios");

async function run() {
  const url = "https://leados-api.abmgroups.org/uploads/transcoded_1O8JpoDsomSXChMZmJ-X413h6pdVBph_B.mp4";
  console.log("Checking URL:", url);
  try {
    const res = await axios.head(url);
    console.log("Status code:", res.status);
  } catch (err) {
    console.error("Failed:", err.message, err.response ? err.response.status : "");
  }
}

run();
