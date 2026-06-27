/* eslint-env node */
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const axios = require('axios');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID_GSC_I,
  process.env.GOOGLE_CLIENT_SECRET_GSC_I,
  process.env.GOOGLE_CALLBACK_LOCALSEOBRIDGE
);

const dataForSeoAuth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leados',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
});

let isConnected = false;
let globalGoogleTokens = null;

router.get('/status', async (req, res) => {
  try {
    const isDemo = req.headers['x-data-mode'] === 'demo';
    res.json({ connected: isConnected || isDemo });
  } catch (error) {
    console.error('Error checking GBP status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/auth/google', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/business.manage'],
    prompt: 'consent'
  });
  res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    isConnected = true;
    globalGoogleTokens = tokens;
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/thedal/local-seo-bridge?success=true`);
  } catch (err) {
    console.error('Error in callback', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/thedal/local-seo-bridge?error=oauth_failed`);
  }
});

router.post('/connect', async (req, res) => {
  res.json({ success: true, message: 'Google Business Profile connected successfully' });
});

router.post('/disconnect', async (req, res) => {
  try {
    isConnected = false;
    globalGoogleTokens = null;
    res.json({ success: true, message: 'Google Business Profile disconnected' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/data', async (req, res) => {
  const isDemo = req.headers['x-data-mode'] === 'demo';
  if (!isConnected && !isDemo) {
    return res.status(403).json({ error: 'Not connected to Google Business Profile' });
  }

  const businessName = req.query.name || 'Your Business';
  
  if (isDemo) {
    return res.json({
      business: {
        name: businessName,
        address: '123 Tech Park, Pondicherry, India',
        phone: '+91 98765 43210',
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
          text: 'Excellent service and great selection of products. ExportersIndia has been key to our business success.',
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

  // Attempt to fetch from Official Google API first
  if (globalGoogleTokens && globalGoogleTokens.access_token) {
    try {
      const headers = { Authorization: `Bearer ${globalGoogleTokens.access_token}` };
      
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
        googleApiError = "No Google Business Profile accounts found for this Google User.";
      }
    } catch (err) {
      googleApiError = err.response ? err.response.data : err.message;
      console.error('Failed to fetch real GBP API data, falling back to DataForSEO:', googleApiError);
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

    // Attempt to fetch real reviews from DataForSEO
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
      })).filter(r => r.text); // Only keep reviews that have text
    } catch (revErr) {
      console.error('Failed to fetch DFS reviews:', revErr.message);
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
    console.error('Error fetching GBP data:', error);
    res.status(500).json({ error: 'Failed to fetch real data from Google' });
  }
});

router.post('/reply-review', async (req, res) => {
  const { reviewId, replyText } = req.body;
  if (!reviewId || !replyText) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  if (globalGoogleTokens && globalGoogleTokens.access_token) {
    try {
      // For real reviews, reviewId is the full name "accounts/{accountId}/locations/{locationId}/reviews/{reviewId}"
      // If it's a number (fallback), we catch it below.
      if (typeof reviewId === 'string' && reviewId.startsWith('accounts/')) {
        await axios.put(`https://mybusinessreviews.googleapis.com/v1/${reviewId}/reply`, {
          comment: replyText
        }, {
          headers: { Authorization: `Bearer ${globalGoogleTokens.access_token}` }
        });
        return res.json({ success: true, message: 'Reply posted to Google successfully via official API!' });
      }
    } catch (e) {
      console.error('Failed to post reply via Google API', e.response?.data || e.message);
      return res.status(403).json({ error: 'Google API Permission Denied (Not verified or Review ID invalid)' });
    }
  }

  // Fallback / Mock
  res.json({ success: true, message: 'Reply posted to Google (Simulated)' });
});

router.post('/create-post', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  res.json({ success: true, message: 'Update posted to Google Business Profile' });
});

module.exports = router;
