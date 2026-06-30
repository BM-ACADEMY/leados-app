const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/contentController");
const pool = require("../db/connection");

// Stats for the dashboard top cards
router.get("/stats", ctrl.getStats);

// Expose public Meta configuration
router.get("/config", (req, res) => {
  res.json({ appId: process.env.META_APP_ID || "" });
});

// Brand social accounts
router.get("/social-accounts", ctrl.getSocialAccounts);

// List content by status: /api/content?status=PENDING
router.get("/", ctrl.getContent);

// Approve / Reject
router.post("/:id/approve", ctrl.approveContent);
router.post("/:id/reject", ctrl.rejectContent);

// AI caption suggestions
router.post("/:id/suggest-captions", ctrl.suggestCaptions);

// AI story suggestions
router.post("/:id/suggest-stories", ctrl.suggestStories);

// Save edits (caption, schedule, platforms)
router.patch("/:id", ctrl.updateContent);
router.put("/:id/edit", ctrl.updateContent);

// AI caption generation
router.post("/generate-captions", ctrl.generateCaptions);

// Batch create queue items
router.post("/batch", ctrl.createBatchContent);

// Meta OAuth callback and account linking
router.post("/meta/callback", ctrl.handleMetaCallback);
router.post("/meta/link-account", ctrl.linkBrandAccount);

// Trigger publishing
router.post("/:id/publish", ctrl.publishPost);

// Called by n8n after successful publish
router.post('/:id/publish-success', async (req, res) => {
  const { id } = req.params;
  const { platform_post_ids } = req.body;
  try {
    await pool.query(
      `UPDATE content_queue 
       SET status = 'PUBLISHED', published_at = NOW(), platform_post_ids = $2 
       WHERE id = $1`,
      [id, JSON.stringify(platform_post_ids)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Called by n8n when publish fails
router.post('/:id/publish-fail', async (req, res) => {
  const { id } = req.params;
  const { error_message, error_response } = req.body;
  try {
    await pool.query(
      `UPDATE content_queue 
       SET status = 'FAILED', failure_reason = $2, failed_at = NOW() 
       WHERE id = $1`,
      [id, error_message]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Google Drive monitors settings
router.get("/monitors", ctrl.getFolderMonitors);
router.post("/monitors", ctrl.upsertFolderMonitor);

module.exports = router;
