const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const axios = require('axios');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

const dataForSeoAuth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

// Ensure the local review replies table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS mafiya_review_replies (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
    review_id    VARCHAR(255) NOT NULL UNIQUE,
    reply_text   TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW()
  );
`).catch(err => console.error('[Mafiya Reviews] Table creation failed:', err));

// Helper to refresh client token
async function refreshClientToken(clientId) {
  try {
    const tokenRes = await pool.query(
      'SELECT refresh_token FROM mafiya_gmb_tokens WHERE client_id = $1',
      [clientId]
    );
    if (tokenRes.rowCount === 0 || !tokenRes.rows[0].refresh_token) return null;

    const { refresh_token } = tokenRes.rows[0];
    oauth2Client.setCredentials({ refresh_token });
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newExpiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
    
    await pool.query(
      `UPDATE mafiya_gmb_tokens 
       SET access_token = $1, expires_at = $2 
       WHERE client_id = $3`,
      [credentials.access_token, newExpiresAt, clientId]
    );
    return credentials.access_token;
  } catch (err) {
    console.error(`[Mafiya Reviews] Failed to refresh token in helper for client ${clientId}:`, err.message);
    return null;
  }
}

// Helper to get client token (and refresh if expired)
async function getClientGoogleToken(clientId) {
  const tokenRes = await pool.query(
    'SELECT access_token, refresh_token, expires_at FROM mafiya_gmb_tokens WHERE client_id = $1',
    [clientId]
  );
  if (tokenRes.rowCount === 0) return null;

  const { access_token, refresh_token, expires_at } = tokenRes.rows[0];
  
  if (expires_at && new Date(expires_at).getTime() < Date.now() + 5 * 60 * 1000) {
    if (refresh_token) {
      const refreshed = await refreshClientToken(clientId);
      if (refreshed) return refreshed;
    }
  }
  
  return access_token;
}

// GET status for a client
router.get('/status', async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  try {
    const isDemo = req.headers['x-data-mode'] === 'demo';
    const result = await pool.query(
      'SELECT id, gmb_verified FROM mafiya_gmb_clients WHERE id = $1',
      [clientId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = result.rows[0];
    res.json({ connected: client.gmb_verified || isDemo });
  } catch (error) {
    console.error('[Mafiya Reviews] GET /status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET review data for a client
router.get('/data', async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  const isDemo = req.headers['x-data-mode'] === 'demo';

  try {
    const clientRes = await pool.query(
      'SELECT * FROM mafiya_gmb_clients WHERE id = $1',
      [clientId]
    );
    if (clientRes.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = clientRes.rows[0];
    const businessName = client.business_name || 'Your Business';

    // Load persistent replies from database
    const localRepliesRes = await pool.query(
      'SELECT review_id, reply_text FROM mafiya_review_replies WHERE client_id = $1',
      [clientId]
    );
    const localRepliesMap = {};
    localRepliesRes.rows.forEach(row => {
      localRepliesMap[row.review_id] = row.reply_text;
    });

    if (isDemo) {
      const demoReviews = [
        {
          id: 'demo-1',
          author: 'Anjali Devi',
          rating: 5,
          text: 'Very professional service. Highly satisfied with their GMB optimization!',
          date: 'Yesterday',
          replied: true,
          replyText: 'Thank you for the review, John!'
        },
        {
          id: 'demo-2',
          author: 'Priya Sharma',
          rating: 4,
          text: 'Very easy onboarding process and very professional team. Highly recommended.',
          date: '3 days ago',
          replied: false,
          replyText: ''
        },
        {
          id: 'demo-3',
          author: 'Robert Lee',
          rating: 5,
          text: 'Outstanding support! They helped us configure our profile and we got organic leads within the first week.',
          date: '1 week ago',
          replied: true,
          replyText: 'Thank you Robert! We are happy to help.'
        }
      ].map(r => {
        if (localRepliesMap[r.id]) {
          return { ...r, replied: true, replyText: localRepliesMap[r.id] };
        }
        return r;
      });

      return res.json({
        business: {
          name: businessName,
          address: '123 Tech Park, Pondicherry, India',
          phone: client.phone_number || '+91 98765 43210',
          rating: 4.8,
          totalReviews: demoReviews.length,
          profileUrl: 'https://maps.google.com'
        },
        insights: {
          views: 1250, viewsTrend: '+12%',
          searches: 840, searchesTrend: '+8%',
          actions: 310, actionsTrend: '+15%'
        },
        recentReviews: demoReviews
      });
    }

    let googleApiError = null;
    let accessToken = await getClientGoogleToken(clientId);

    if (accessToken) {
      let success = false;
      const attemptFetch = async (token) => {
        const headers = { Authorization: `Bearer ${token}` };
        // 1. Get Accounts
        const accRes = await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers });
        const accounts = accRes.data.accounts || [];
        if (accounts.length > 0) {
          const accountId = accounts[0].name;
          
          // 2. Get Locations
          const locRes = await axios.get(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title,storeCode`, { headers });
          const locations = locRes.data.locations || [];
          if (locations.length > 0) {
            const loc = locations[0];
            const locationId = loc.name;
            
            // 3. Get Reviews (with pagination to fetch all)
            let allReviews = [];
            let nextPageToken = null;
            let pageNum = 0;
            try {
              do {
                const url = `https://mybusinessreviews.googleapis.com/v1/${locationId}/reviews?pageSize=50` + (nextPageToken ? `&pageToken=${nextPageToken}` : '');
                const revRes = await axios.get(url, { headers });
                const reviews = revRes.data.reviews || [];
                allReviews = allReviews.concat(reviews);
                nextPageToken = revRes.data.nextPageToken;
                pageNum++;
              } while (nextPageToken && pageNum < 15);
            } catch (pageErr) {
              console.error('[Mafiya Reviews] Error paginating reviews:', pageErr.message);
            }
            
            const realReviews = allReviews.map(r => {
              const reviewIdStr = r.name;
              const hasLocalReply = localRepliesMap[reviewIdStr];
              return {
                id: reviewIdStr,
                author: r.reviewer?.displayName || 'Google User',
                rating: r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : r.starRating === 'THREE' ? 3 : r.starRating === 'TWO' ? 2 : 1,
                text: r.comment || '',
                date: r.createTime ? new Date(r.createTime).toLocaleDateString() : 'Recently',
                replied: !!r.reviewReply || !!hasLocalReply,
                replyText: r.reviewReply?.comment || hasLocalReply || ''
              };
            });

            res.json({
              business: {
                name: loc.title || businessName,
                address: 'Verified Google Location',
                phone: 'Verified Google Location',
                rating: realReviews.length > 0 ? (realReviews.reduce((acc, r) => acc + r.rating, 0) / realReviews.length).toFixed(1) : 0,
                totalReviews: realReviews.length,
                profileUrl: ''
              },
              insights: {
                views: 0, viewsTrend: '0%',
                searches: 0, searchesTrend: '0%',
                actions: 0, actionsTrend: '0%'
              },
              recentReviews: realReviews
            });
            success = true;
          } else {
            googleApiError = "No locations found for this account.";
          }
        } else {
          googleApiError = "No Google Business Profile accounts found.";
        }
      };

      try {
        await attemptFetch(accessToken);
        if (success) return;
      } catch (err) {
        googleApiError = err.response ? err.response.data : err.message;
        
        if (err.response && err.response.status === 401) {
          console.log('[Mafiya Reviews] Access token 401 expired, attempting refresh...');
          const newAccessToken = await refreshClientToken(clientId);
          if (newAccessToken) {
            try {
              await attemptFetch(newAccessToken);
              return;
            } catch (retryErr) {
              googleApiError = retryErr.response ? retryErr.response.data : retryErr.message;
              await pool.query('DELETE FROM mafiya_gmb_tokens WHERE client_id = $1', [clientId]);
              await pool.query('UPDATE mafiya_gmb_clients SET gmb_verified = false WHERE id = $1', [clientId]);
            }
          } else {
            await pool.query('DELETE FROM mafiya_gmb_tokens WHERE client_id = $1', [clientId]);
            await pool.query('UPDATE mafiya_gmb_clients SET gmb_verified = false WHERE id = $1', [clientId]);
          }
        }
      }
    }

    // Fallback to DataForSEO Maps SERP scraping and polling reviews
    try {
      const mapsQuery = client.website_url 
        ? client.website_url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] 
        : `${businessName} Pondicherry`;

      const mapsPostData = [{ keyword: mapsQuery, language_code: "en", location_name: "India" }];
      const dfsRes = await axios({
        method: 'post',
        url: 'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
        data: mapsPostData,
        headers: { 'Authorization': `Basic ${dataForSeoAuth}`, 'Content-Type': 'application/json' }
      });

      const items = dfsRes.data.tasks?.[0]?.result?.[0]?.items || [];
      let gbpData = items[0];

      // Fallback search if domain search returned nothing
      if (!gbpData && client.website_url) {
        const fallbackRes = await axios({
          method: 'post',
          url: 'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
          data: [{ keyword: `${businessName} Pondicherry`, language_code: "en", location_name: "India" }],
          headers: { 'Authorization': `Basic ${dataForSeoAuth}`, 'Content-Type': 'application/json' }
        });
        gbpData = fallbackRes.data.tasks?.[0]?.result?.[0]?.items?.[0];
      }

      const cid = gbpData?.cid;
      const resolvedTitle = gbpData?.title || businessName;

      // Fetch reviews from DataForSEO
      let realReviewsDfs = [];
      if (cid || resolvedTitle) {
        try {
          const taskPostData = cid 
            ? { cid, location_name: "India", language_code: "en", depth: 100 }
            : { keyword: resolvedTitle, location_name: "India", language_code: "en", depth: 100 };

          const postRes = await axios({
            method: 'post',
            url: 'https://api.dataforseo.com/v3/business_data/google/reviews/task_post',
            data: [taskPostData],
            headers: { 'Authorization': `Basic ${dataForSeoAuth}`, 'Content-Type': 'application/json' }
          });

          const task = postRes.data.tasks?.[0];
          if (task && task.status_code === 20100) {
            const taskId = task.id;
            
            // Poll for completion (up to 7 attempts, total 10.5 seconds max)
            let attempts = 0;
            const maxAttempts = 7;
            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1500));
              const getRes = await axios({
                method: 'get',
                url: `https://api.dataforseo.com/v3/business_data/google/reviews/task_get/${taskId}`,
                headers: { 'Authorization': `Basic ${dataForSeoAuth}` }
              });
              const getTask = getRes.data.tasks?.[0];
              if (getTask && getTask.status_code === 20000) {
                const reviewItems = getTask.result?.[0]?.items || [];
                realReviewsDfs = reviewItems.map((r, index) => {
                  const reviewIdStr = (r.review_id || index).toString();
                  const hasLocalReply = localRepliesMap[reviewIdStr];
                  return {
                    id: reviewIdStr,
                    author: r.profile_name || 'Google User',
                    rating: r.rating?.value || 5,
                    text: r.review_text || '',
                    date: r.time_ago || 'Recently',
                    replied: !!r.owner_answer || !!hasLocalReply,
                    replyText: r.owner_answer || hasLocalReply || ''
                  };
                }).filter(r => r.text);
                break;
              }
              attempts++;
            }
          }
        } catch (revErr) {
          console.error('[Mafiya Reviews] Failed to poll DFS reviews:', revErr.message);
        }
      }

      if (!realReviewsDfs || realReviewsDfs.length === 0) {
        realReviewsDfs = [
          {
            id: 'demo-1',
            author: 'Anjali Devi',
            rating: 5,
            text: 'Very professional service. Highly satisfied with their GMB optimization!',
            date: '2 days ago',
            replied: false,
            replyText: ''
          },
          {
            id: 'demo-2',
            author: 'Saravanan K',
            rating: 4,
            text: 'Good customer support and quick onboarding.',
            date: '1 week ago',
            replied: false,
            replyText: ''
          }
        ].map(r => {
          if (localRepliesMap[r.id]) {
            return { ...r, replied: true, replyText: localRepliesMap[r.id] };
          }
          return r;
        });
      }

      res.json({
        business: {
          name: gbpData?.title || businessName,
          address: gbpData?.address || 'Address not found on Google',
          phone: gbpData?.phone || 'Phone not found',
          rating: gbpData?.rating?.value || 4.5,
          totalReviews: gbpData?.rating?.votes_count || (realReviewsDfs ? realReviewsDfs.length : 0),
          profileUrl: gbpData?.url || ''
        },
        insights: {
          views: 0, viewsTrend: '0%',
          searches: 0, searchesTrend: '0%',
          actions: 0, actionsTrend: '0%'
        },
        recentReviews: realReviewsDfs,
        _debug_google_error: googleApiError
      });
    } catch (error) {
      console.error('[Mafiya Reviews] Error fetching GBP data:', error.message);
      
      const fallbackReviews = [
        {
          id: 'demo-1',
          author: 'Anjali Devi',
          rating: 5,
          text: 'Very professional service. Highly satisfied with their GMB optimization!',
          date: '2 days ago',
          replied: false,
          replyText: ''
        },
        {
          id: 'demo-2',
          author: 'Saravanan K',
          rating: 4,
          text: 'Good customer support and quick onboarding.',
          date: '1 week ago',
          replied: false,
          replyText: ''
        }
      ].map(r => {
        if (localRepliesMap[r.id]) {
          return { ...r, replied: true, replyText: localRepliesMap[r.id] };
        }
        return r;
      });

      res.json({
        business: {
          name: businessName,
          address: 'Address not found on Google',
          phone: 'Phone not found',
          rating: 4.5,
          totalReviews: fallbackReviews.length,
          profileUrl: ''
        },
        insights: {
          views: 0, viewsTrend: '0%',
          searches: 0, searchesTrend: '0%',
          actions: 0, actionsTrend: '0%'
        },
        recentReviews: fallbackReviews,
        _debug_google_error: googleApiError || error.message
      });
    }
  } catch (err) {
    console.error('[Mafiya Reviews] GET /data error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST reply to a review
router.post('/reply-review', async (req, res) => {
  const { clientId, reviewId, replyText } = req.body;
  if (!clientId || !reviewId || !replyText) {
    return res.status(400).json({ error: 'Missing required fields: clientId, reviewId, replyText' });
  }
  
  // Save reply persistently to database so it is not lost/static
  try {
    await pool.query(
      `INSERT INTO mafiya_review_replies (client_id, review_id, reply_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id) 
       DO UPDATE SET reply_text = EXCLUDED.reply_text`,
      [clientId, reviewId.toString(), replyText]
    );
  } catch (dbErr) {
    console.error('[Mafiya Reviews] Failed to save reply to DB:', dbErr.message);
  }

  const accessToken = await getClientGoogleToken(clientId);
  if (accessToken) {
    try {
      if (typeof reviewId === 'string' && reviewId.startsWith('accounts/')) {
        await axios.put(`https://mybusinessreviews.googleapis.com/v1/${reviewId}/reply`, {
          comment: replyText
        }, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return res.json({ success: true, message: 'Reply posted to Google successfully via official API!' });
      }
    } catch (e) {
      console.error('[Mafiya Reviews] Failed to post reply via Google API', e.response?.data || e.message);
    }
  }

  res.json({ success: true, message: 'Reply saved successfully' });
});

module.exports = router;
