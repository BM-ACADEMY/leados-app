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
      try {
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
        console.error(`Failed to refresh GMB token for client ${clientId}:`, err.message);
      }
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

    if (isDemo) {
      return res.json({
        business: {
          name: businessName,
          address: '123 Tech Park, Pondicherry, India',
          phone: client.phone_number || '+91 98765 43210',
          rating: 4.8,
          totalReviews: 24,
          profileUrl: 'https://maps.google.com'
        },
        insights: {
          views: 1250, viewsTrend: '+12%',
          searches: 840, searchesTrend: '+8%',
          actions: 310, actionsTrend: '+15%'
        },
        recentReviews: [
          {
            id: 'rev-1',
            author: 'John Doe',
            rating: 5,
            text: 'Excellent service and great response time. Mafiya OS has helped our local business get more visibility.',
            date: 'Yesterday',
            replied: true,
            replyText: 'Thank you for the review, John!'
          },
          {
            id: 'rev-2',
            author: 'Priya Sharma',
            rating: 4,
            text: 'Very easy onboarding process and very professional team. Highly recommended.',
            date: '3 days ago',
            replied: false,
            replyText: ''
          },
          {
            id: 'rev-3',
            author: 'Robert Lee',
            rating: 5,
            text: 'Outstanding support! They helped us configure our profile and we got organic leads within the first week.',
            date: '1 week ago',
            replied: true,
            replyText: 'Thank you Robert! We are happy to help.'
          }
        ]
      });
    }

    let googleApiError = null;
    const accessToken = await getClientGoogleToken(clientId);

    if (accessToken) {
      try {
        const headers = { Authorization: `Bearer ${accessToken}` };
        
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
            
            // 3. Get Reviews
            const revRes = await axios.get(`https://mybusinessreviews.googleapis.com/v1/${locationId}/reviews`, { headers });
            const reviews = revRes.data.reviews || [];
            
            const realReviews = reviews.map(r => ({
              id: r.name, // Use the full review name as the ID for replying
              author: r.reviewer?.displayName || 'Google User',
              rating: r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : r.starRating === 'THREE' ? 3 : r.starRating === 'TWO' ? 2 : 1,
              text: r.comment || '',
              date: r.createTime ? new Date(r.createTime).toLocaleDateString() : 'Recently',
              replied: !!r.reviewReply,
              replyText: r.reviewReply?.comment || ''
            }));

            return res.json({
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
          } else {
            googleApiError = "No locations found for this account.";
          }
        } else {
          googleApiError = "No Google Business Profile accounts found.";
        }
      } catch (err) {
        googleApiError = err.response ? err.response.data : err.message;
        console.error('[Mafiya Reviews] Failed to fetch real GBP API data, falling back to DataForSEO:', googleApiError);
      }
    }

    // Fallback to DataForSEO Maps SERP scraping
    try {
      const postData = [{ keyword: businessName, language_code: "en", location_name: "India" }];
      const dfsRes = await axios({
        method: 'post',
        url: 'https://api.dataforseo.com/v3/serp/google/maps/live/advanced',
        data: postData,
        headers: { 'Authorization': `Basic ${dataForSeoAuth}`, 'Content-Type': 'application/json' }
      });

      const items = dfsRes.data.tasks?.[0]?.result?.[0]?.items;
      let gbpData = items?.[0];

      // Fetch reviews from DataForSEO
      let realReviewsDfs = [];
      try {
        const reviewPostData = [{ keyword: businessName, language_code: "en", location_name: "India", depth: 10 }];
        const dfsReviewsRes = await axios({
          method: 'post',
          url: 'https://api.dataforseo.com/v3/serp/google/reviews/live/advanced',
          data: reviewPostData,
          headers: { 'Authorization': `Basic ${dataForSeoAuth}`, 'Content-Type': 'application/json' }
        });
        const reviewItems = dfsReviewsRes.data.tasks?.[0]?.result?.[0]?.items || [];
        realReviewsDfs = reviewItems.slice(0, 10).map((r, index) => ({
          id: r.review_id || index,
          author: r.profile_name || 'Google User',
          rating: r.rating?.value || 5,
          text: r.review_text || '',
          date: r.time_ago || 'Recently',
          replied: !!r.owner_answer,
          replyText: r.owner_answer || ''
        })).filter(r => r.text);
      } catch (revErr) {
        console.error('[Mafiya Reviews] Failed to fetch DFS reviews:', revErr.message);
      }

      res.json({
        business: {
          name: gbpData?.title || businessName,
          address: gbpData?.address || 'Address not found on Google',
          phone: gbpData?.phone || 'Phone not found',
          rating: gbpData?.rating?.value || 0,
          totalReviews: gbpData?.rating?.votes_count || 0,
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
      console.error('[Mafiya Reviews] Error fetching GBP data:', error);
      res.status(500).json({ error: 'Failed to fetch real data from Google' });
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
      return res.status(403).json({ error: 'Google API Permission Denied (Not verified or Review ID invalid)' });
    }
  }

  res.json({ success: true, message: 'Reply posted to Google (Simulated)' });
});

module.exports = router;
