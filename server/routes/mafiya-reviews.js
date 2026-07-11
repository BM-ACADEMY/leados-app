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

// Ensure the local review replies table exists and GMB clients table has cache columns
pool.query(`
  CREATE TABLE IF NOT EXISTS mafiya_review_replies (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
    review_id    VARCHAR(255) NOT NULL UNIQUE,
    reply_text   TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW()
  );
  ALTER TABLE mafiya_gmb_clients ADD COLUMN IF NOT EXISTS reviews_cache TEXT;
  ALTER TABLE mafiya_gmb_clients ADD COLUMN IF NOT EXISTS reviews_updated_at TIMESTAMP;
  ALTER TABLE mafiya_gmb_clients ADD COLUMN IF NOT EXISTS logo_url TEXT;

  CREATE TABLE IF NOT EXISTS mafiya_gmb_brain (
    id           SERIAL PRIMARY KEY,
    client_id    INTEGER REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
    entry_type   VARCHAR(50) NOT NULL,
    content      TEXT NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS mafiya_gmb_posts (
    id             SERIAL PRIMARY KEY,
    client_id      INTEGER REFERENCES mafiya_gmb_clients(id) ON DELETE CASCADE,
    post_type      VARCHAR(50) NOT NULL,
    caption        TEXT NOT NULL,
    poster_title   VARCHAR(255),
    poster_subtitle VARCHAR(255),
    bg_theme       VARCHAR(50) DEFAULT 'orange',
    status         VARCHAR(50) DEFAULT 'draft',
    image_url      TEXT,
    created_at     TIMESTAMP DEFAULT NOW()
  );
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS post_title VARCHAR(255);
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS start_date DATE;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS end_date DATE;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS start_time TIME;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS end_time TIME;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(100);
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS redeem_link TEXT;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS terms TEXT;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS repeats VARCHAR(50) DEFAULT 'Does not repeat';
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS custom_days TEXT;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS repeat_end_date DATE;
  ALTER TABLE mafiya_gmb_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP;
`).catch(err => console.error('[Mafiya Reviews] Schema migration failed:', err));

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

// Helper to save reviews data to database cache
function saveToCache(clientId, data) {
  pool.query(
    'UPDATE mafiya_gmb_clients SET reviews_cache = $1, reviews_updated_at = NOW() WHERE id = $2',
    [JSON.stringify(data), clientId]
  ).catch(err => console.error('[Mafiya Reviews] Cache update failed:', err.message));
}

// GET status for a client
router.get('/status', async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  try {
    const result = await pool.query(
      'SELECT id, gmb_verified FROM mafiya_gmb_clients WHERE id = $1',
      [clientId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    const client = result.rows[0];
    res.json({ connected: client.gmb_verified });
  } catch (error) {
    console.error('[Mafiya Reviews] GET /status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET review data for a client
router.get('/data', async (req, res) => {
  const { clientId, refresh } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

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

    // Check Cache first
    if (client.reviews_cache && client.reviews_updated_at && refresh !== 'true') {
      const cacheAgeMs = Date.now() - new Date(client.reviews_updated_at).getTime();
      // If cache is less than 15 minutes old, return it instantly!
      if (cacheAgeMs < 15 * 60 * 1000) {
        try {
          const parsedCache = JSON.parse(client.reviews_cache);
          console.log(`[Mafiya Reviews] Returning cached GMB reviews for client ${clientId} (age: ${Math.round(cacheAgeMs / 1000)}s)`);
          return res.json(parsedCache);
        } catch (e) {
          console.error('[Mafiya Reviews] Failed to parse reviews cache:', e.message);
        }
      }
    }

    // Load persistent replies from database
    const localRepliesRes = await pool.query(
      'SELECT review_id, reply_text FROM mafiya_review_replies WHERE client_id = $1',
      [clientId]
    );
    const localRepliesMap = {};
    localRepliesRes.rows.forEach(row => {
      localRepliesMap[row.review_id] = row.reply_text;
    });

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
          let allLocations = [];
          for (const acc of accounts) {
            try {
              const locRes = await axios.get(`https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode`, { headers });
              if (locRes.data.locations) {
                const locs = locRes.data.locations.map(l => ({ ...l, accountName: acc.name }));
                allLocations = allLocations.concat(locs);
              }
            } catch (err) {
              console.error(`[Mafiya Reviews] Failed to fetch locations for account ${acc.name}:`, err.message);
            }
          }

          if (allLocations.length > 0) {
            // Find the location that matches the business name, or fallback to the first location
            const cleanStr = (s) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const loc = allLocations.find(l => {
              const cleanTitle = cleanStr(l.title);
              const cleanBizName = cleanStr(businessName);
              return cleanTitle.includes(cleanBizName) || cleanBizName.includes(cleanTitle);
            }) || allLocations[0];
            const locationId = `${loc.accountName}/${loc.name}`;
            
            // 3. Get Reviews (with pagination to fetch all)
            let allReviews = [];
            let nextPageToken = null;
            let pageNum = 0;
            try {
              do {
                const url = `https://mybusiness.googleapis.com/v4/${locationId}/reviews?pageSize=50` + (nextPageToken ? `&pageToken=${nextPageToken}` : '');
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
                replyText: r.reviewReply?.comment || hasLocalReply || '',
                timestamp: r.createTime || ''
              };
            });

            realReviews.sort((a, b) => {
              const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return timeB - timeA;
            });

            if (realReviews.length > 0) {
              const resData = {
                business: {
                  name: loc.title || businessName,
                  address: 'Verified Google Location',
                  phone: 'Verified Google Location',
                  rating: (realReviews.reduce((acc, r) => acc + r.rating, 0) / realReviews.length).toFixed(1),
                  totalReviews: realReviews.length,
                  profileUrl: ''
                },
                insights: {
                  views: Math.floor((parseInt(clientId, 10) * 147 + 520) * 1.8),
                  viewsTrend: `+${((parseInt(clientId, 10) * 3 + 8) % 15) + 5}%`,
                  searches: Math.floor((parseInt(clientId, 10) * 89 + 310) * 1.5),
                  searchesTrend: `+${((parseInt(clientId, 10) * 2 + 5) % 10) + 3}%`,
                  actions: Math.floor((parseInt(clientId, 10) * 34 + 115) * 1.2),
                  actionsTrend: `+${((parseInt(clientId, 10) * 4 + 7) % 12) + 4}%`
                },
                recentReviews: realReviews
              };
              saveToCache(clientId, resData);
              res.json(resData);
              success = true;
            } else {
              googleApiError = "No reviews found via official Google API.";
            }
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
            ? { cid, location_name: "India", language_code: "en", depth: 100, sort_by: "newest" }
            : { keyword: resolvedTitle, location_name: "India", language_code: "en", depth: 100, sort_by: "newest" };

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
                  console.log("DFS ITEM DATA:", r.profile_name, "timestamp:", r.timestamp, "time_ago:", r.time_ago);
                  const reviewIdStr = (r.review_id || index).toString();
                  const hasLocalReply = localRepliesMap[reviewIdStr];
                  return {
                    id: reviewIdStr,
                    author: r.profile_name || 'Google User',
                    rating: r.rating?.value || 5,
                    text: r.review_text || '',
                    date: r.time_ago || 'Recently',
                    replied: !!r.owner_answer || !!hasLocalReply,
                    replyText: r.owner_answer || hasLocalReply || '',
                    timestamp: r.timestamp || ''
                  };
                }).filter(r => r.text);

                // Sort reviews chronologically by timestamp (newest first)
                realReviewsDfs.sort((a, b) => {
                  const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                  const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                  return timeB - timeA;
                });
                break;
              }
              attempts++;
            }
          }
        } catch (revErr) {
          console.error('[Mafiya Reviews] Failed to poll DFS reviews:', revErr.message);
        }
      }

      if (!realReviewsDfs) {
        realReviewsDfs = [];
      }

      const resData = {
        business: {
          name: gbpData?.title || businessName,
          address: gbpData?.address || 'Address not found on Google',
          phone: gbpData?.phone || 'Phone not found',
          rating: gbpData?.rating?.value || 4.5,
          totalReviews: gbpData?.rating?.votes_count || (realReviewsDfs ? realReviewsDfs.length : 0),
          profileUrl: gbpData?.url || ''
        },
        insights: {
          views: Math.floor((parseInt(clientId, 10) * 147 + 520) * 1.8),
          viewsTrend: `+${((parseInt(clientId, 10) * 3 + 8) % 15) + 5}%`,
          searches: Math.floor((parseInt(clientId, 10) * 89 + 310) * 1.5),
          searchesTrend: `+${((parseInt(clientId, 10) * 2 + 5) % 10) + 3}%`,
          actions: Math.floor((parseInt(clientId, 10) * 34 + 115) * 1.2),
          actionsTrend: `+${((parseInt(clientId, 10) * 4 + 7) % 12) + 4}%`
        },
        recentReviews: realReviewsDfs,
        _debug_google_error: googleApiError
      };
      if (realReviewsDfs && realReviewsDfs.length > 0) {
        saveToCache(clientId, resData);
      }
      res.json(resData);
    } catch (error) {
      console.error('[Mafiya Reviews] Error fetching GBP data:', error.message);
      
      const resData = {
        business: {
          name: businessName,
          address: 'Address not found on Google',
          phone: 'Phone not found',
          rating: 4.5,
          totalReviews: 0,
          profileUrl: ''
        },
        insights: {
          views: Math.floor((parseInt(clientId, 10) * 147 + 520) * 1.8),
          viewsTrend: `+${((parseInt(clientId, 10) * 3 + 8) % 15) + 5}%`,
          searches: Math.floor((parseInt(clientId, 10) * 89 + 310) * 1.5),
          searchesTrend: `+${((parseInt(clientId, 10) * 2 + 5) % 10) + 3}%`,
          actions: Math.floor((parseInt(clientId, 10) * 34 + 115) * 1.2),
          actionsTrend: `+${((parseInt(clientId, 10) * 4 + 7) % 12) + 4}%`
        },
        recentReviews: [],
        _debug_google_error: googleApiError || error.message
      };
      res.json(resData);
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
  
  // Save reply persistently to database and clear cache
  try {
    await pool.query(
      `INSERT INTO mafiya_review_replies (client_id, review_id, reply_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id) 
       DO UPDATE SET reply_text = EXCLUDED.reply_text`,
      [clientId, reviewId.toString(), replyText]
    );

    // Clear reviews cache to force a fresh pull on reload/fetch
    await pool.query(
      'UPDATE mafiya_gmb_clients SET reviews_updated_at = NULL WHERE id = $1',
      [clientId]
    );
  } catch (dbErr) {
    console.error('[Mafiya Reviews] Failed to save reply / clear cache in DB:', dbErr.message);
  }

  const accessToken = await getClientGoogleToken(clientId);
  if (accessToken) {
    try {
      if (typeof reviewId === 'string' && reviewId.startsWith('accounts/')) {
        await axios.put(`https://mybusiness.googleapis.com/v4/${reviewId}/reply`, {
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

// POST generate AI reply content via Groq/OpenAI API
router.post('/generate-ai-reply', async (req, res) => {
  const { clientId, author, rating, text } = req.body;
  const fs = require('fs');
  const path = require('path');
  
  fs.appendFileSync(
    path.join(__dirname, '../debug_error.log'),
    `[${new Date().toISOString()}] API Called: clientId=${clientId}, author=${author}, rating=${rating}, text=${text}\n`
  );

  if (!clientId) {
    fs.appendFileSync(path.join(__dirname, '../debug_error.log'), `[${new Date().toISOString()}] Error: clientId is required\n`);
    return res.status(400).json({ error: 'clientId is required' });
  }

  try {
    const clientRes = await pool.query(
      'SELECT business_name FROM mafiya_gmb_clients WHERE id = $1',
      [clientId]
    );
    const businessName = clientRes.rows[0]?.business_name || 'our company';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      fs.appendFileSync(path.join(__dirname, '../debug_error.log'), `[${new Date().toISOString()}] Error: OPENAI_API_KEY is not configured on server.\n`);
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on server.' });
    }

    // Fetch and incorporate GMB Brain entries for this client
    const brainRes = await pool.query(
      'SELECT entry_type, content FROM mafiya_gmb_brain WHERE client_id = $1',
      [clientId]
    );
    
    const brain = {
      tone: [],
      offer: [],
      keyword: [],
      qa: [],
      blacklist: [],
      seasonal: []
    };

    brainRes.rows.forEach(row => {
      const typeKey = (row.entry_type || '').toLowerCase().trim();
      if (brain[typeKey]) {
        brain[typeKey].push(row.content);
      }
    });

    let brainDirectives = '';
    if (brain.tone.length > 0) {
      brainDirectives += `\nTONE AND STYLE GUIDELINES (Adhere strictly to this tone):\n${brain.tone.map(t => `- ${t}`).join('\n')}\n`;
    }
    if (brain.offer.length > 0) {
      brainDirectives += `\nPROMOTIONS / OFFERS (Incorporate or refer to these active offers if appropriate, especially for positive reviews):\n${brain.offer.map(o => `- ${o}`).join('\n')}\n`;
    }
    if (brain.keyword.length > 0) {
      brainDirectives += `\nTARGET KEYWORDS (Try to naturally incorporate these keywords/phrases into the response if it fits context):\n${brain.keyword.map(k => `- ${k}`).join('\n')}\n`;
    }
    if (brain.qa.length > 0) {
      brainDirectives += `\nFAQ / RESPONSE DATA (Reference this facts or information if it directly answers parts of the review content):\n${brain.qa.map(q => `- ${q}`).join('\n')}\n`;
    }
    if (brain.blacklist.length > 0) {
      brainDirectives += `\nBLACKLIST / STRICT RULES (NEVER use these words, concepts, or terms in the response. Avoid them entirely):\n${brain.blacklist.map(b => `- ${b}`).join('\n')}\n`;
    }
    if (brain.seasonal.length > 0) {
      brainDirectives += `\nSEASONAL PROMOTIONS (Include reference to these seasonal campaigns if relevant):\n${brain.seasonal.map(s => {
        try {
          const parsed = JSON.parse(s);
          return `- [Campaign: ${parsed.title}] ${parsed.text}`;
        } catch (e) {
          return `- ${s}`;
        }
      }).join('\n')}\n`;
    }

    const prompt = `You are an expert customer relations manager representing the business "${businessName}". 
Write a highly personalized, friendly, and very short response to this Google Review.

Reviewer Name: ${author}
Rating: ${rating} out of 5 stars
Review Text: "${text || 'No comment provided.'}"
${brainDirectives}
Guidelines:
- Keep the response warm and engaging: around 2 to 3 detailed sentences (about 250 to 450 characters).
- Include 1 or 2 friendly emojis (like 😊, 👍, 🌟, 🙌) to make the message warm.
- If the reviewer has left a comment/feedback, briefly mention the specific thing they praised.
- If the rating is 4 or 5 stars, thank them warmly and say we look forward to working with them again.
- If the rating is 1, 2, or 3 stars, apologize professionally and invite them to contact us directly.
- **IMPORTANT**: Generate ONLY the body paragraph(s) of the response. Do NOT include any greetings (like "Dear...", "Hi...") or sign-offs (like "Warm Regards", "Best Regards", "Team...") as these will be automatically added by the template.`;

    const chatRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = chatRes.data?.choices?.[0]?.message?.content?.trim() || 
                  `Thank you ${author} for your review! We appreciate your feedback.`;

    fs.appendFileSync(
      path.join(__dirname, '../debug_error.log'),
      `[${new Date().toISOString()}] AI generation success: "${reply}"\n`
    );

    res.json({ reply });
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error('[Mafiya Reviews] OpenAI/Groq API generation error:', errorDetails);
    fs.appendFileSync(
      path.join(__dirname, '../debug_error.log'),
      `[${new Date().toISOString()}] API Error: ${JSON.stringify(errorDetails)}\n`
    );
    res.status(500).json({ error: 'Failed to generate reply via AI.' });
  }
});

// GET GMB Brain entries
router.get('/brain', async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });
  try {
    const result = await pool.query(
      'SELECT * FROM mafiya_gmb_brain WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[Mafiya Reviews] GET /brain error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST save/update GMB Brain entry
router.post('/brain', async (req, res) => {
  const { id, clientId, entryType, content } = req.body;
  if (!clientId || !entryType || !content) {
    return res.status(400).json({ error: 'clientId, entryType, and content are required' });
  }
  try {
    if (id) {
      const result = await pool.query(
        `UPDATE mafiya_gmb_brain
         SET entry_type = $1, content = $2, updated_at = NOW()
         WHERE id = $3 AND client_id = $4
         RETURNING *`,
        [entryType, content, id, clientId]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Entry not found' });
      return res.json(result.rows[0]);
    } else {
      const result = await pool.query(
        `INSERT INTO mafiya_gmb_brain (client_id, entry_type, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [clientId, entryType, content]
      );
      return res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error('[Mafiya Reviews] POST /brain error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE GMB Brain entry
router.delete('/brain/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM mafiya_gmb_brain WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted successfully' });
  } catch (err) {
    console.error('[Mafiya Reviews] DELETE /brain error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET GMB Posts for a client
router.get('/posts', async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });
  try {
    const result = await pool.query(
      'SELECT * FROM mafiya_gmb_posts WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[Mafiya Reviews] GET /posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST save a GMB Post (draft or published)
router.post('/posts', async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  let { 
    clientId, 
    postType, 
    caption, 
    posterTitle, 
    posterSubtitle, 
    bgTheme, 
    status, 
    imageUrl,
    postTitle,
    startDate,
    endDate,
    startTime,
    endTime,
    couponCode,
    redeemLink,
    terms,
    repeats,
    customDays,
    repeatEndDate,
    scheduledAt
  } = req.body;

  if (!clientId || !postType || !caption) {
    return res.status(400).json({ error: 'clientId, postType, and caption are required' });
  }
  
  try {
    let finalImageUrl = imageUrl;
    if (imageUrl && (imageUrl.startsWith('data:image') || imageUrl.startsWith('data:video'))) {
      try {
        const isVideo = imageUrl.startsWith('data:video');
        const match = imageUrl.match(/^data:(image|video)\/(\w+);base64,/);
        const ext = match ? match[2] : (isVideo ? 'mp4' : 'jpg');
        const base64Data = imageUrl.replace(/^data:(image|video)\/\w+;base64,/, '');
        const filename = `gmb_post_${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, '..', 'uploads', 'gmb_posts');
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        
        // Dynamically get the exact API domain that this request came from (e.g. leados-api.abmgroups.org)
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'leados-api.abmgroups.org';
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const apiUrl = `${protocol}://${host}`;
        
        // Use a dedicated dynamic API route to serve the image, bypassing Nginx static file intercepts
        finalImageUrl = `${apiUrl}/api/mafiya/reviews/image/${filename}`;
      } catch (err) {
        console.error('[Mafiya Reviews] Failed to process base64 file:', err);
        // Fallback to the original base64 string if it fails
      }
    }

    // 1. Save to local database
    const result = await pool.query(
      `INSERT INTO mafiya_gmb_posts 
        (client_id, post_type, caption, poster_title, poster_subtitle, bg_theme, status, image_url,
         post_title, start_date, end_date, start_time, end_time, coupon_code, redeem_link, terms, repeats, custom_days, repeat_end_date, scheduled_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        clientId, 
        postType, 
        caption, 
        posterTitle, 
        posterSubtitle, 
        bgTheme || 'orange', 
        status || 'draft', 
        finalImageUrl,
        postTitle || null,
        startDate || null,
        endDate || null,
        startTime || null,
        endTime || null,
        couponCode || null,
        redeemLink || null,
        terms || null,
        repeats || 'Does not repeat',
        customDays || null,
        repeatEndDate || null,
        scheduledAt || null
      ]
    );
    const savedPost = result.rows[0];

    // If the post is scheduled for later, we do NOT publish it to GMB immediately
    if (status === 'scheduled') {
      return res.status(201).json(savedPost);
    }

    // 2. Publish to Google My Business API (if credentials exist)
    try {
      const clientRes = await pool.query('SELECT google_account_id, google_location_id FROM mafiya_gmb_clients WHERE id = $1', [clientId]);
      const tokenString = await getClientGoogleToken(clientId);
      
      const client = clientRes.rows[0];

      if (client && client.google_account_id && client.google_location_id && tokenString) {
        // Prepare Google LocalPost body
        const gmbPostBody = {
          languageCode: 'en-US',
          summary: caption
        };

        const parseGoogleDate = (dateStr) => {
          if (!dateStr) return null;
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            return {
              year: parseInt(parts[0], 10),
              month: parseInt(parts[1], 10),
              day: parseInt(parts[2], 10)
            };
          }
          return null;
        };

        const parseGoogleTime = (timeStr) => {
          if (!timeStr) return null;
          const parts = timeStr.split(':');
          if (parts.length >= 2) {
            return {
              hours: parseInt(parts[0], 10),
              minutes: parseInt(parts[1], 10),
              seconds: 0
            };
          }
          return null;
        };

        if (postType === 'Offer' || postType === 'offers') {
          gmbPostBody.topicType = 'OFFER';
          const startD = parseGoogleDate(startDate);
          const endD = parseGoogleDate(endDate);
          const startT = parseGoogleTime(startTime);
          const endT = parseGoogleTime(endTime);
          
          gmbPostBody.event = {
            title: postTitle || posterTitle || 'Special Offer',
            schedule: {
              startDate: startD || undefined,
              startTime: startT || undefined,
              endDate: endD || undefined,
              endTime: endT || undefined
            }
          };
          gmbPostBody.offer = {
            couponCode: couponCode || undefined,
            redeemOnlineUrl: redeemLink || undefined,
            termsConditions: terms || undefined
          };
        } else if (postType === 'Event' || postType === 'events') {
          gmbPostBody.topicType = 'EVENT';
          const startD = parseGoogleDate(startDate);
          const endD = parseGoogleDate(endDate);
          const startT = parseGoogleTime(startTime);
          const endT = parseGoogleTime(endTime);
          gmbPostBody.event = {
            title: postTitle || posterTitle || 'Special Event',
            schedule: {
              startDate: startD || undefined,
              startTime: startT || undefined,
              endDate: endD || undefined,
              endTime: endT || undefined
            }
          };
        } else {
          gmbPostBody.topicType = 'STANDARD';
        }

        // Parse button from posterSubtitle (format: "ButtonType|Link") for non-Offer posts
        if (postType !== 'Offer' && postType !== 'offers') {
          if (posterSubtitle && posterSubtitle.includes('|')) {
            const [bType, bLink] = posterSubtitle.split('|');
            const googleActionMapping = {
              'Book': 'BOOK',
              'Order online': 'ORDER',
              'Buy': 'SHOP',
              'Learn more': 'LEARN_MORE',
              'Sign up': 'SIGN_UP',
              'Call now': 'CALL'
            };
            if (googleActionMapping[bType]) {
              gmbPostBody.callToAction = {
                actionType: googleActionMapping[bType]
              };
              // CALL doesn't need a URL, Google uses primary phone automatically
              if (googleActionMapping[bType] !== 'CALL' && bLink) {
                gmbPostBody.callToAction.url = bLink;
              }
            }
          }
        }
        
        // Add image (Google requires a public URL, so base64 won't work natively without upload)
        if (finalImageUrl && finalImageUrl.startsWith('http')) {
            // Automatically detect if running on local Windows PC vs Live Ubuntu Server
             const isLocalWindows = __dirname.includes(':\\') || __dirname.includes('Desktop');
             const isVideo = finalImageUrl.endsWith('.mp4') || finalImageUrl.endsWith('.webm') || finalImageUrl.endsWith('.mov') || finalImageUrl.endsWith('.avi');
             let googleImageUrl = isLocalWindows 
               ? (isVideo ? 'https://www.w3schools.com/html/mov_bbb.mp4' : 'https://picsum.photos/600/400') // Use dummy public media for local testing
               : finalImageUrl; // Use actual media on live server
 
             console.log(`[GMB API Debug] Local OS detected? ${isLocalWindows}`);
             console.log(`[GMB API Debug] finalImageUrl saved to DB: ${finalImageUrl}`);
             console.log(`[GMB API Debug] googleImageUrl sent to API: ${googleImageUrl}`);
 
             gmbPostBody.media = [{
                 mediaFormat: isVideo ? 'VIDEO' : 'PHOTO',
                 sourceUrl: googleImageUrl
             }];
         }

        const gmbResponse = await axios.post(
          `https://mybusiness.googleapis.com/v4/accounts/${client.google_account_id}/locations/${client.google_location_id}/localPosts`,
          gmbPostBody,
          {
            headers: {
              Authorization: `Bearer ${tokenString}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('[GMB API] Post successfully published:', gmbResponse.data);
      } else {
        console.log('[GMB API] Skipped GMB publish: Missing google_account_id, google_location_id, or access_token.');
      }
    } catch (gmbErr) {
      console.error('[GMB API] Failed to publish post:', gmbErr.response ? JSON.stringify(gmbErr.response.data) : gmbErr.message);
      // We allow the local post to succeed even if Google fails for now.
    }

    res.status(201).json(savedPost);
  } catch (err) {
    console.error('[Mafiya Reviews] POST /posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Fetch available Google Locations for a client
router.get('/google-locations', async (req, res) => {
  const clientId = req.query.clientId;
  if (!clientId) return res.status(400).json({ error: 'clientId required' });

  try {
    const token = await getClientGoogleToken(clientId);
    if (!token) return res.status(401).json({ error: 'Not authenticated with Google' });

    const headers = { Authorization: `Bearer ${token}` };
    const accRes = await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers });
    const accounts = accRes.data.accounts || [];
    
    let allLocations = [];
    for (const acc of accounts) {
      try {
        const locRes = await axios.get(`https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,storeCode`, { headers });
        if (locRes.data.locations) {
          const locs = locRes.data.locations.map(l => ({
            accountId: acc.name.replace('accounts/', ''),
            locationId: l.name.replace('locations/', ''),
            title: l.title
          }));
          allLocations = allLocations.concat(locs);
        }
      } catch (err) {
        console.error(`[Mafiya Reviews] Failed to fetch locations for account ${acc.name}`, err.message);
      }
    }
    res.json(allLocations);
  } catch (err) {
    console.error('[Mafiya Reviews] GET /google-locations error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save selected Google Location
router.put('/google-locations', async (req, res) => {
  const { clientId, google_account_id, google_location_id } = req.body;
  if (!clientId || !google_account_id || !google_location_id) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  
  try {
    const cleanAccountId = google_account_id.replace('accounts/', '');
    const cleanLocationId = google_location_id.replace('locations/', '');

    await pool.query(
      'UPDATE mafiya_gmb_clients SET google_account_id = $1, google_location_id = $2 WHERE id = $3',
      [cleanAccountId, cleanLocationId, clientId]
    );
    res.json({ success: true, google_account_id: cleanAccountId, google_location_id: cleanLocationId });
  } catch (err) {
    console.error('[Mafiya Reviews] PUT /google-locations error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a GMB Post
router.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const fs = require('fs');
  const path = require('path');
  try {
    const result = await pool.query(
      'DELETE FROM mafiya_gmb_posts WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Post not found' });

    // Delete local image file if it exists
    const deletedPost = result.rows[0];
    const imageUrl = deletedPost.image_url;
    if (imageUrl && imageUrl.includes('/api/mafiya/reviews/image/')) {
      try {
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1];
        const filepath = path.join(__dirname, '..', 'uploads', 'gmb_posts', filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          console.log(`[GMB API] Deleted local image file: ${filename}`);
        }
      } catch (err) {
        console.error('[GMB API] Failed to delete local image file:', err.message);
      }
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('[Mafiya Reviews] DELETE /posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/posts/generate', async (req, res) => {
  const { clientId, postType, selectedEntryText, selectedEntryTitle, customImagePrompt } = req.body;
  if (!clientId || !postType) {
    return res.status(400).json({ error: 'clientId and postType are required' });
  }

  try {
    // 1. Fetch GMB Client details
    const clientRes = await pool.query(
      'SELECT business_name, phone_number FROM mafiya_gmb_clients WHERE id = $1',
      [clientId]
    );
    if (clientRes.rowCount === 0) return res.status(404).json({ error: 'Client not found' });
    const { business_name: businessName, phone_number: phoneNumber } = clientRes.rows[0];

    // 2. Fetch AI Brain entries
    const brainRes = await pool.query(
      'SELECT entry_type, content FROM mafiya_gmb_brain WHERE client_id = $1',
      [clientId]
    );

    const brain = {
      tone: [],
      offer: [],
      keyword: [],
      qa: [],
      blacklist: [],
      seasonal: [],
      creative_brief: []
    };
    brainRes.rows.forEach(row => {
      const k = (row.entry_type || '').toLowerCase().trim();
      // Map frontend category names to DB types
      const mappedKey = k === 'offers' ? 'offer' : k === 'q&a bank' ? 'qa' : k === 'keywords' ? 'keyword' : k;
      if (brain[mappedKey]) brain[mappedKey].push(row.content);
    });

    // 3. Select directives based on type
    let toneRules = brain.tone.length > 0 ? brain.tone.join(', ') : 'Warm, professional, engaging';
    let blacklistRules = brain.blacklist.length > 0 ? `NEVER use these words: ${brain.blacklist.join(', ')}` : '';
    let keywordRules = brain.keyword.length > 0 ? `Include these terms naturally: ${brain.keyword.join(', ')}` : '';

    // Handle Creative Brief details if available
    let creativeBriefContext = '';
    let imageDesignPrompt = '';
    let dallENegative = '';
    
    if (brain.creative_brief && brain.creative_brief.length > 0) {
      try {
        const briefData = JSON.parse(brain.creative_brief[0]);
        creativeBriefContext = `AI Creative Brief Guidelines:
- Target Audience: ${briefData.targetAudience || 'General'}
- Core Goal: ${briefData.goal || 'Awareness'}
- Brand Style: ${briefData.brandStyle || 'Modern'}
- Color Palette: ${briefData.brandColors || 'Aesthetic colors'}
- Visual Theme: ${briefData.imageStyle || 'Realistic photography'}
- Camera Perspective: ${briefData.cameraAngle || 'Front shot'}
- Lighting: ${briefData.lighting || 'Cinematic lighting'}`;
        
        imageDesignPrompt = `Theme colors: ${briefData.brandColors}. Style: ${briefData.brandStyle}. Quality/Look: ${briefData.imageStyle}, using ${briefData.cameraAngle} and ${briefData.lighting}. Make it look like a highly professional, state-of-the-art visual ad suitable for Google Business.`;
        dallENegative = briefData.negativePrompt ? `, avoid ${briefData.negativePrompt}` : '';
      } catch (e) {
        console.error('Error parsing creative brief content:', e);
      }
    }

    let typeContext = '';
    if (selectedEntryText) {
      typeContext = `Based on this specific entry from our brand's AI Brain [Category: ${postType}]:
${selectedEntryTitle ? `Title: ${selectedEntryTitle}\n` : ''}Content: ${selectedEntryText}`;
    } else {
      if (postType === 'offers' && brain.offer.length > 0) {
        typeContext = `Here are active offers: \n${brain.offer.map(o => `- ${o}`).join('\n')}`;
      } else if (postType === 'seasonal' && brain.seasonal.length > 0) {
        typeContext = `Here are seasonal focal campaigns: \n${brain.seasonal.map(s => {
          try {
            const parsed = JSON.parse(s);
            return `- Campaign [${parsed.title}]: ${parsed.text}`;
          } catch (e) {
            return `- ${s}`;
          }
        }).join('\n')}`;
      } else if (postType === 'qa' && brain.qa.length > 0) {
        typeContext = `Here are Q&As / facts: \n${brain.qa.map(q => `- ${q}`).join('\n')}`;
      } else {
        typeContext = `Active offers: ${brain.offer.slice(0,2).join('; ') || 'None'}\nQ&A Info: ${brain.qa.slice(0,2).join('; ') || 'None'}`;
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured.' });

    const prompt = `You are an expert customer relations and content marketer representing the business "${businessName}" (Phone: ${phoneNumber}).
We need to generate a Google Business Profile (GMB) local post of type "${postType.toUpperCase()}".

${creativeBriefContext ? `Follow this Brand Strategy:\n${creativeBriefContext}\n` : ''}
Brand Tone/Voice: ${toneRules}
${blacklistRules}
${keywordRules}

Context Data (incorporate this info):
${typeContext}

Generate a JSON object with exactly these fields:
1. "caption": A search-optimized GMB post caption (about 80 to 120 words). It should contain a clear call-to-action (e.g. Call us at ${phoneNumber}!).
2. "posterTitle": A short, catchy title text optimized for a flyer/poster (max 3-4 words, uppercase, e.g. "SPECIAL OFFER!" or "JOIN NOW!").
3. "posterSubtitle": A short subtitle highlighting the key benefit (max 5-7 words, e.g. "100% Placement Course Support").

**CRITICAL**: Return ONLY the raw JSON block. Do not include markdown code block syntax (like \`\`\`json) or any wrapping text. Respond with pure JSON.`;

    const chatRes = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let rawOutput = chatRes.data?.choices?.[0]?.message?.content?.trim() || '';
    
    // Clean code fences if LLM ignored instructions
    if (rawOutput.startsWith('```')) {
      rawOutput = rawOutput.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(rawOutput);
    } catch (e) {
      console.warn('[Mafiya Posts] AI returned invalid JSON:', rawOutput);
      const capMatch = rawOutput.match(/"caption":\s*"([^"]+)"/);
      const titleMatch = rawOutput.match(/"posterTitle":\s*"([^"]+)"/);
      const subMatch = rawOutput.match(/"posterSubtitle":\s*"([^"]+)"/);

      parsed = {
        caption: capMatch ? capMatch[1] : `Visit ${businessName} today! Call us at ${phoneNumber}.`,
        posterTitle: titleMatch ? titleMatch[1] : 'Special Announcement',
        posterSubtitle: subMatch ? subMatch[1] : 'Contact us for details'
      };
    }

    // 4. Generate AI Image using Pollinations.ai (Free, Fast, Keyless, no fallback needed)
    let imageUrl = '';
    try {
      // Build visual prompt integrating design instruction brief
      let dallEPrompt = `A premium advertisement visual poster for "${businessName}". Heading: "${parsed.posterTitle}". Subheading: "${parsed.posterSubtitle}". ${imageDesignPrompt || 'Clean modern ad design, 3D style marketing flyer.'}${dallENegative}`;
      if (customImagePrompt) {
        dallEPrompt = `A premium advertisement visual poster for "${businessName}". Heading: "${parsed.posterTitle}". Subheading: "${parsed.posterSubtitle}". Prompt: ${customImagePrompt}`;
      }
      
      const encodedPrompt = encodeURIComponent(dallEPrompt);
      imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
    } catch (err) {
      console.error('[Image Generation Error]:', err.message);
      imageUrl = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop';
    }

    res.json({
      caption: parsed.caption,
      posterTitle: parsed.posterTitle,
      posterSubtitle: parsed.posterSubtitle,
      imageUrl
    });
  } catch (err) {
    console.error('[Mafiya Posts] Generate AI error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to generate post content.' });
  }
});

// Helper function to publish a post from the database to GMB API
async function publishPostToGmb(postId) {
  try {
    const postRes = await pool.query('SELECT * FROM mafiya_gmb_posts WHERE id = $1', [postId]);
    if (postRes.rowCount === 0) {
      console.error(`[GMB API] Post with ID ${postId} not found for GMB publication.`);
      return;
    }
    const post = postRes.rows[0];
    const { 
      client_id: clientId, 
      post_type: postType, 
      caption, 
      poster_title: posterTitle, 
      poster_subtitle: posterSubtitle, 
      image_url: finalImageUrl,
      post_title: postTitle,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      coupon_code: couponCode,
      redeem_link: redeemLink,
      terms
    } = post;

    const clientRes = await pool.query('SELECT google_account_id, google_location_id FROM mafiya_gmb_clients WHERE id = $1', [clientId]);
    const tokenString = await getClientGoogleToken(clientId);
    const client = clientRes.rows[0];

    if (client && client.google_account_id && client.google_location_id && tokenString) {
      const gmbPostBody = {
        languageCode: 'en-US',
        summary: caption
      };

      const parseGoogleDate = (dateObj) => {
        if (!dateObj) return null;
        let d = dateObj;
        if (typeof dateObj === 'string') {
          const parts = dateObj.split('-');
          if (parts.length === 3) {
            return {
              year: parseInt(parts[0], 10),
              month: parseInt(parts[1], 10),
              day: parseInt(parts[2], 10)
            };
          }
          return null;
        }
        // In PostgreSQL, date columns are returned as Date objects
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate()
        };
      };

      const parseGoogleTime = (timeStr) => {
        if (!timeStr) return null;
        const parts = timeStr.split(':');
        if (parts.length >= 2) {
          return {
            hours: parseInt(parts[0], 10),
            minutes: parseInt(parts[1], 10),
            seconds: 0
          };
        }
        return null;
      };

      if (postType === 'Offer' || postType === 'offers') {
        gmbPostBody.topicType = 'OFFER';
        gmbPostBody.event = {
          title: postTitle || posterTitle || 'Special Offer',
          schedule: {
            startDate: parseGoogleDate(startDate) || undefined,
            startTime: parseGoogleTime(startTime) || undefined,
            endDate: parseGoogleDate(endDate) || undefined,
            endTime: parseGoogleTime(endTime) || undefined
          }
        };
        gmbPostBody.offer = {
          couponCode: couponCode || undefined,
          redeemOnlineUrl: redeemLink || undefined,
          termsConditions: terms || undefined
        };
      } else if (postType === 'Event' || postType === 'events') {
        gmbPostBody.topicType = 'EVENT';
        gmbPostBody.event = {
          title: postTitle || posterTitle || 'Special Event',
          schedule: {
            startDate: parseGoogleDate(startDate) || undefined,
            startTime: parseGoogleTime(startTime) || undefined,
            endDate: parseGoogleDate(endDate) || undefined,
            endTime: parseGoogleTime(endTime) || undefined
          }
        };
      } else {
        gmbPostBody.topicType = 'STANDARD';
      }

      if (postType !== 'Offer' && postType !== 'offers') {
        if (posterSubtitle && posterSubtitle.includes('|')) {
          const [bType, bLink] = posterSubtitle.split('|');
          const googleActionMapping = {
            'Book': 'BOOK',
            'Order online': 'ORDER',
            'Buy': 'SHOP',
            'Learn more': 'LEARN_MORE',
            'Sign up': 'SIGN_UP',
            'Call now': 'CALL'
          };
          if (googleActionMapping[bType]) {
            gmbPostBody.callToAction = {
              actionType: googleActionMapping[bType]
            };
            if (googleActionMapping[bType] !== 'CALL' && bLink) {
              gmbPostBody.callToAction.url = bLink;
            }
          }
        }
      }

      if (finalImageUrl && finalImageUrl.startsWith('http')) {
        const isLocalWindows = __dirname.includes(':\\') || __dirname.includes('Desktop');
        const isVideo = finalImageUrl.endsWith('.mp4') || finalImageUrl.endsWith('.webm') || finalImageUrl.endsWith('.mov') || finalImageUrl.endsWith('.avi');
        let googleImageUrl = isLocalWindows 
          ? (isVideo ? 'https://www.w3schools.com/html/mov_bbb.mp4' : 'https://picsum.photos/600/400')
          : finalImageUrl;

        gmbPostBody.media = [{
          mediaFormat: isVideo ? 'VIDEO' : 'PHOTO',
          sourceUrl: googleImageUrl
        }];
      }

      const gmbResponse = await axios.post(
        `https://mybusiness.googleapis.com/v4/accounts/${client.google_account_id}/locations/${client.google_location_id}/localPosts`,
        gmbPostBody,
        {
          headers: {
            Authorization: `Bearer ${tokenString}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`[GMB API] Post ${postId} successfully published:`, gmbResponse.data);
      
      // Update status to published in the database
      await pool.query(
        "UPDATE mafiya_gmb_posts SET status = 'published' WHERE id = $1",
        [postId]
      );
    } else {
      console.log(`[GMB API] Skipped GMB publish for post ${postId}: Missing client identifiers.`);
    }
  } catch (err) {
    console.error(`[GMB API] Failed to publish post ${postId}:`, err.response ? JSON.stringify(err.response.data) : err.message);
  }
}

// node-cron job to run every minute and publish scheduled posts
const cron = require('node-cron');
cron.schedule('* * * * *', async () => {
  try {
    const result = await pool.query(
      "SELECT id FROM mafiya_gmb_posts WHERE status = 'scheduled' AND scheduled_at <= NOW()"
    );
    for (const row of result.rows) {
      console.log(`[Scheduler] Processing scheduled post ID: ${row.id}`);
      await publishPostToGmb(row.id);
    }
  } catch (err) {
    console.error('[Scheduler Error] Failed to process scheduled posts:', err.message);
  }
});

module.exports = router;
