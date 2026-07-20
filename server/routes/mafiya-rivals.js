const express = require('express');
const router = express.Router();
const pool = require('../db/connection');

// GET all rivals for a business
router.get('/:business_id', async (req, res) => {
  const { business_id } = req.params;
  try {
    const rivalsResult = await pool.query(
      'SELECT * FROM mafiya_rivals WHERE business_id = $1 ORDER BY created_at ASC',
      [business_id]
    );
    
    const rivals = rivalsResult.rows;
    
    // Fetch latest metrics for each rival
    for (let i = 0; i < rivals.length; i++) {
      const metricsResult = await pool.query(
        'SELECT * FROM mafiya_rival_metrics WHERE rival_id = $1 ORDER BY last_updated DESC LIMIT 1',
        [rivals[i].id]
      );
      rivals[i].metrics = metricsResult.rows.length > 0 ? metricsResult.rows[0] : null;
    }

    res.json(rivals);
  } catch (err) {
    console.error('[Mafiya] GET /rivals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new rival
router.post('/', async (req, res) => {
  const { business_id, competitor_name, gbp_url, city, keyword, place_id } = req.body;

  if (!business_id || !competitor_name) {
    return res.status(400).json({ error: 'business_id and competitor_name are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO mafiya_rivals (business_id, competitor_name, gbp_url, city, keyword, place_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [business_id, competitor_name, gbp_url, city, keyword, place_id]
    );

    // Provide initial empty metrics
    const newRival = result.rows[0];
    newRival.metrics = null;

    res.status(201).json(newRival);
  } catch (err) {
    console.error('[Mafiya] POST /rivals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a rival
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM mafiya_rivals WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Rival not found' });
    res.json({ message: 'Rival deleted successfully' });
  } catch (err) {
    console.error('[Mafiya] DELETE /rivals error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST trigger manual refresh for a business's rivals
router.post('/refresh/:business_id', async (req, res) => {
  const { business_id } = req.params;
  
  // For now, this is a placeholder simulating the data fetch
  // In a real implementation, you would trigger the Google API scraping/fetching here
  
  try {
    // 1. Fetch rivals for this business
    const rivalsResult = await pool.query('SELECT * FROM mafiya_rivals WHERE business_id = $1', [business_id]);
    const rivals = rivalsResult.rows;

    for (const rival of rivals) {
      // 2. Simulate API data (Randomized for prototype)
      const ourRank = Math.floor(Math.random() * 5) + 1;
      const theirRank = Math.floor(Math.random() * 5) + 1;
      const ourReviews = Math.floor(Math.random() * 200) + 50;
      const theirReviews = Math.floor(Math.random() * 200) + 50;
      
      let status = 'watch_closely';
      if (ourRank < theirRank) status = 'winning';
      else if (ourRank > theirRank) status = 'losing';

      // 3. Store metrics
      await pool.query(
        `INSERT INTO mafiya_rival_metrics (rival_id, their_rank, our_rank, their_reviews, our_reviews, status, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [rival.id, theirRank, ourRank, theirReviews, ourReviews, status]
      );
    }

    res.json({ success: true, message: 'Refresh triggered successfully' });
  } catch (err) {
    console.error('[Mafiya] POST /rivals/refresh error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Daily Cron Job for Rival Metrics (Runs at midnight)
const cron = require('node-cron');
cron.schedule('0 0 * * *', async () => {
  console.log('[Mafiya Rivals] Running daily metrics refresh...');
  try {
    const businessesResult = await pool.query('SELECT DISTINCT business_id FROM mafiya_rivals');
    for (const b of businessesResult.rows) {
      // Logic for background refresh
      const rivalsResult = await pool.query('SELECT * FROM mafiya_rivals WHERE business_id = $1', [b.business_id]);
      const rivals = rivalsResult.rows;

      for (const rival of rivals) {
        const ourRank = Math.floor(Math.random() * 5) + 1;
        const theirRank = Math.floor(Math.random() * 5) + 1;
        const ourReviews = Math.floor(Math.random() * 200) + 50;
        const theirReviews = Math.floor(Math.random() * 200) + 50;
        
        let status = 'watch_closely';
        if (ourRank < theirRank) status = 'winning';
        else if (ourRank > theirRank) status = 'losing';

        await pool.query(
          `INSERT INTO mafiya_rival_metrics (rival_id, their_rank, our_rank, their_reviews, our_reviews, status, last_updated)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [rival.id, theirRank, ourRank, theirReviews, ourReviews, status]
        );
      }
    }
    console.log('[Mafiya Rivals] Daily metrics refresh completed.');
  } catch (err) {
    console.error('[Mafiya Rivals] Daily cron job error:', err);
  }
});

module.exports = router;
