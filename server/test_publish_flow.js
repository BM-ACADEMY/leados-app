const { publishPost } = require('./controllers/contentController');
const pool = require('./db/connection');

async function test() {
  console.log("Setting up content item 143...");
  
  // 1. Update post 143 to select all 4 formats
  const formats = ['instagram_post', 'instagram_story', 'facebook_post', 'facebook_story'];
  await pool.query(
    "UPDATE content_queue SET platforms = $1, selected_channels = $1 WHERE id = 143",
    [JSON.stringify(formats)]
  );

  // Set env flag to return a public image for story card testing
  process.env.TEST_PUBLIC_STORY_IMAGE = 'true';

  // 2. Clean up jobs so we can test them:
  // - instagram_post (IG Reel): Keep as 'success'
  // - facebook_post (FB Reel): Delete so it runs in background
  // - instagram_story / facebook_story: Delete so they run in background
  await pool.query(
    "DELETE FROM publish_queue WHERE content_id = 143 AND channel IN ('facebook_post', 'instagram_story', 'facebook_story')"
  );

  console.log("Seeded channels. Triggering publishPost...");
  
  const dummyReq = { 
    params: { id: 143 },
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
    
    // Poll the DB to wait for background execution to complete
    console.log("Waiting for background publishing to complete...");
    let completed = false;
    for (let i = 0; i < 60; i++) { // Max 5 minutes
      await new Promise(r => setTimeout(r, 5000));
      const { rows: currentJobs } = await pool.query(
        "SELECT status, channel FROM publish_queue WHERE content_id = 143"
      );
      const active = currentJobs.filter(j => j.status === 'pending' || j.status === 'publishing');
      console.log(`Checking status (attempt ${i+1}): ${active.length} active jobs remaining.`);
      if (active.length === 0) {
        completed = true;
        break;
      }
    }
    if (!completed) {
      console.warn("Background publishing timed out after 5 minutes.");
    }
  } catch (err) {
    console.error("Execution error:", err);
  } finally {
    // Print the final content_queue status
    const { rows: postRows } = await pool.query("SELECT status, platform_post_ids, error_message FROM content_queue WHERE id = 143");
    console.log("\nFINAL CONTENT QUEUE STATE:");
    console.log(JSON.stringify(postRows[0], null, 2));

    // Print the final publish_queue status for ID 143
    const { rows: jobs } = await pool.query("SELECT * FROM publish_queue WHERE content_id = 143 ORDER BY id ASC");
    console.log("\nFINAL PUBLISH QUEUE JOBS FOR 143:");
    console.log(JSON.stringify(jobs, null, 2));
    
    await pool.end();
  }
}

test();
