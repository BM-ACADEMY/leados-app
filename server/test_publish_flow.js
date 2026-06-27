const { publishPost } = require('./controllers/contentController');
const pool = require('./db/connection');

async function test() {
  console.log("Setting up content item 141...");
  
  // 1. Update post 141 to select all 4 formats
  const formats = ['instagram_post', 'instagram_story', 'facebook_post', 'facebook_story'];
  await pool.query(
    "UPDATE content_queue SET platforms = $1, selected_channels = $1 WHERE id = 141",
    [JSON.stringify(formats)]
  );

  // Set env flag to return a public image for story card testing
  process.env.TEST_PUBLIC_STORY_IMAGE = 'true';

  // 2. Clean up jobs so we can test them:
  // - instagram_post (IG Reel): Keep as 'success'
  // - facebook_post (FB Reel): Keep as 'success' (verifying it is skipped on republish)
  // - instagram_story / facebook_story: Delete so they get recreated as 'pending' to test story publishing.
  await pool.query(
    "DELETE FROM publish_queue WHERE content_id = 141 AND channel IN ('instagram_story', 'facebook_story')"
  );

  console.log("Seeded channels. Triggering publishPost...");
  
  const dummyReq = { 
    params: { id: 141 },
    headers: {
      host: 'leados-api.abmgroups.org' // Mimic production host so public URLs resolve properly
    }
  };
  
  const dummyRes = {
    statusCode: 200,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      console.log("\n=================== PUBLISH RESPONSE ===================");
      console.log(JSON.stringify(data, null, 2));
      console.log("========================================================");
    }
  };

  try {
    await publishPost(dummyReq, dummyRes);
  } catch (err) {
    console.error("Execution error:", err);
  } finally {
    // Print the final publish_queue status for ID 141
    const { rows: jobs } = await pool.query("SELECT * FROM publish_queue WHERE content_id = 141 ORDER BY id ASC");
    console.log("\nFINAL PUBLISH QUEUE JOBS FOR 141:");
    console.log(JSON.stringify(jobs, null, 2));
    
    await pool.end();
  }
}

test();
