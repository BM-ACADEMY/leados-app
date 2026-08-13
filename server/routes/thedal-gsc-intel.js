const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const tokensFile = path.join(__dirname, '../data/gsc_tokens.json');

// Ensure token file exists
if (!fs.existsSync(tokensFile)) {
  fs.writeFileSync(tokensFile, JSON.stringify({}), 'utf8');
}

const getTokens = () => JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
const saveTokens = (data) => fs.writeFileSync(tokensFile, JSON.stringify(data, null, 2), 'utf8');

// Initialize OAuth2 client
const port = process.env.PORT || 3600;
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_GSCINTEL
);

// 1. Check Status (Is the client verified?)
router.get('/status', (req, res) => {
  const { clientId = 'default' } = req.query; // Support multi-client
  const tokens = getTokens();

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.json({ isVerified: false, error: 'MISSING_ENV_KEYS' });
  }

  if (tokens[clientId] && tokens[clientId].refresh_token) {
    return res.json({ isVerified: true });
  }

  res.json({ isVerified: false });
});

// 2. Generate Google OAuth URL
router.get('/auth/google', (req, res) => {
  const { clientId = 'default' } = req.query;

  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Please set GOOGLE_CLIENT_ID in your .env file.' });
  }

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Critical for getting refresh token
    scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
    state: clientId, // Pass client ID to callback
    prompt: 'consent' // Force consent to ensure we always get a refresh token on first connect
  });

  res.redirect(url);
});

// 3. OAuth Callback
router.get('/auth/callback', async (req, res) => {
  const { code, state: clientId } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);

    // We strictly need the refresh_token for background/future requests
    const allTokens = getTokens();
    if (tokens.refresh_token) {
      allTokens[clientId] = tokens;
      saveTokens(allTokens);
    } else if (allTokens[clientId]) {
      // If we already had a refresh token, just update access token
      allTokens[clientId].access_token = tokens.access_token;
      saveTokens(allTokens);
    }

    // Redirect back to frontend
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/thedal/gsc-intel?verified=true`);
  } catch (error) {
    console.error('Error exchanging Google OAuth code:', error);
    res.status(500).send('Authentication failed');
  }
});

// 4. Fetch Live Data from GSC
router.get('/', async (req, res) => {
  const isDemo = req.headers['x-data-mode'] === 'demo';
  const { clientId = 'default', days = '28Days', device = 'All', country = 'All', siteUrl, startDate: customStart, endDate: customEnd } = req.query;

  if (!siteUrl) {
    return res.status(400).json({ error: 'siteUrl is required (e.g., https://bmtechx.in/)' });
  }

  if (isDemo) {
    return res.json({
      metrics: {
        clicks: 12450,
        impressions: 145000,
        ctr: 8.5,
        position: 14.2
      },
      topQueries: [
        { query: 'digital marketing agency', clicks: 1200, impressions: 15000, ctr: 8.0, position: 5.1 },
        { query: 'seo services', clicks: 950, impressions: 12000, ctr: 7.9, position: 4.8 },
        { query: 'web development company', clicks: 800, impressions: 10000, ctr: 8.0, position: 6.2 },
        { query: 'local seo expert', clicks: 500, impressions: 5000, ctr: 10.0, position: 3.5 },
        { query: 'social media management', clicks: 450, impressions: 8000, ctr: 5.6, position: 7.1 }
      ],
      topPages: [
        { page: 'https://' + siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/', clicks: 5000, impressions: 50000, ctr: 10.0, position: 5.5 },
        { page: 'https://' + siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/services/seo', clicks: 2500, impressions: 20000, ctr: 12.5, position: 3.2 },
        { page: 'https://' + siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/about-us', clicks: 1000, impressions: 15000, ctr: 6.6, position: 8.4 },
        { page: 'https://' + siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/blog/seo-tips', clicks: 800, impressions: 10000, ctr: 8.0, position: 4.5 },
        { page: 'https://' + siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/contact', clicks: 500, impressions: 5000, ctr: 10.0, position: 2.1 }
      ],
      isVerified: true
    });
  }

  const allTokens = getTokens();
  const clientTokens = allTokens[clientId];

  if (!clientTokens || !clientTokens.refresh_token) {
    return res.status(200).json({ error: 'Not verified. Please authenticate with Google first.', isVerified: false });
  }

  try {
    oauth2Client.setCredentials(clientTokens);
    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    // Calculate dates based on data freshness (GSC is delayed by ~3 days, except for 24Hours/fresh data)
    let startDate, endDate;
    if (customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    } else if (days === '24Hours') {
      const todayObj = new Date();
      endDate = todayObj.toISOString().split('T')[0];
      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      startDate = yesterdayObj.toISOString().split('T')[0];
    } else {
      const today = new Date();
      today.setDate(today.getDate() - 3);
      endDate = today.toISOString().split('T')[0];

      const startDateObj = new Date(today);
      if (days === '7Days') startDateObj.setDate(startDateObj.getDate() - 7);
      else if (days === '3Months') startDateObj.setDate(startDateObj.getDate() - 90);
      else if (days === '6Months') startDateObj.setDate(startDateObj.getDate() - 180);
      else if (days === '12Months') startDateObj.setDate(startDateObj.getDate() - 365);
      else if (days === '16Months') startDateObj.setDate(startDateObj.getDate() - 480);
      else startDateObj.setDate(startDateObj.getDate() - 28); // Default 28 days
      startDate = startDateObj.toISOString().split('T')[0];
    }

    // Build dimensions and filters
    const dimensions = ['query'];
    const dimensionFilterGroups = [];

    const filters = [];
    if (device !== 'All') {
      filters.push({ dimension: 'device', operator: 'equals', expression: device.toUpperCase() });
    }
    if (country !== 'All') {
      filters.push({ dimension: 'country', operator: 'equals', expression: country.toLowerCase() });
    }

    if (filters.length > 0) {
      dimensionFilterGroups.push({ filters });
    }

    let activeSiteUrl = siteUrl;
    let fallbackSiteUrl = siteUrl.startsWith('sc-domain:')
      ? 'https://' + siteUrl.replace('sc-domain:', '') + '/'
      : 'sc-domain:' + siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    let metricsReq;
    try {
      // 1. Try to Fetch Aggregated Metrics with primary URL
      metricsReq = await searchconsole.searchanalytics.query({
        siteUrl: activeSiteUrl,
        requestBody: { startDate, endDate, dimensions: [], dimensionFilterGroups, dataState: 'all' }
      });
    } catch (err) {
      if (err.code === 403 && fallbackSiteUrl) {
        // If 403 Forbidden, they probably verified the other property type. Try the fallback.
        try {
          metricsReq = await searchconsole.searchanalytics.query({
            siteUrl: fallbackSiteUrl,
            requestBody: { startDate, endDate, dimensions: [], dimensionFilterGroups, dataState: 'all' }
          });
          activeSiteUrl = fallbackSiteUrl; // Keep this for the queries fetch below
        } catch (fallbackErr) {
          throw fallbackErr; // If both fail, throw the error
        }
      } else {
        throw err;
      }
    }

    const totals = metricsReq.data.rows && metricsReq.data.rows.length > 0
      ? metricsReq.data.rows[0]
      : { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    // 2. Fetch Query Level Data (Top 100 queries)
    const queriesReq = await searchconsole.searchanalytics.query({
      siteUrl: activeSiteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        dimensionFilterGroups,
        dataState: 'all',
        rowLimit: 100
      }
    });

    const queries = (queriesReq.data.rows || []).map((row, index) => ({
      id: index + 1,
      query: row.keys?.[0] || '',
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: (row.ctr * 100).toFixed(2), // Convert to percentage
      position: row.position.toFixed(1)
    }));

    // 3. Fetch Top Pages Data (Top 100 pages)
    const pagesReq = await searchconsole.searchanalytics.query({
      siteUrl: activeSiteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        dimensionFilterGroups,
        dataState: 'all',
        rowLimit: 100
      }
    });

    const pages = (pagesReq.data.rows || []).map((row, index) => ({
      id: index + 1,
      page: row.keys?.[0] || '',
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: (row.ctr * 100).toFixed(2), // Convert to percentage
      position: row.position.toFixed(1)
    }));

    // 4. Fetch Top Countries Data (Top 50 countries)
    let countries = [];
    try {
      const countriesReq = await searchconsole.searchanalytics.query({
        siteUrl: activeSiteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['country'],
          dataState: 'all',
          rowLimit: 50
        }
      });
      countries = (countriesReq.data.rows || []).map(row => ({
        countryCode: (row.keys?.[0] || 'unknown').toUpperCase(),
        clicks: row.clicks,
        impressions: row.impressions
      }));
    } catch (cErr) {
      console.error('Failed to fetch GSC countries list', cErr);
    }

    // 5. Fetch Timeseries/Date level metrics (daily trend)
    let timeseries = [];
    try {
      const timeseriesReq = await searchconsole.searchanalytics.query({
        siteUrl: activeSiteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['date'],
          dimensionFilterGroups,
          dataState: 'all',
          rowLimit: 90
        }
      });
      timeseries = (timeseriesReq.data.rows || []).map(row => ({
        date: row.keys?.[0] || '',
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        position: parseFloat(row.position.toFixed(1))
      })).sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (tErr) {
      console.error('Failed to fetch GSC timeseries daily data', tErr);
    }

    // 6. Fetch Device level metrics
    let devices = [];
    try {
      const devicesReq = await searchconsole.searchanalytics.query({
        siteUrl: activeSiteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['device'],
          dataState: 'all',
          rowLimit: 5
        }
      });
      devices = (devicesReq.data.rows || []).map(row => ({
        device: (row.keys?.[0] || 'unknown').toLowerCase(),
        clicks: row.clicks,
        impressions: row.impressions
      }));
    } catch (dErr) {
      console.error('Failed to fetch GSC devices list', dErr);
    }

    // Send payload matching the exact UI structure we built
    res.json({
      isVerified: true,
      siteUrl,
      startDate,
      endDate,
      metrics: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr: (totals.ctr * 100).toFixed(2),
        position: totals.position.toFixed(1),
        trends: { clicks: 0, impressions: 0, ctr: 0, position: 0 } // Trends require fetching previous period data, skipping for performance
      },
      queries,
      topQueries: queries,
      topPages: pages,
      pages,
      countries,
      timeseries,
      devices
    });

  } catch (error) {
    const errorMsg = error.message || '';
    if (error.code === 400 || errorMsg.includes('invalid_grant')) {
      console.log(`[GSC API] invalid_grant (token revoked/invalid) for ${siteUrl}`);
      return res.status(200).json({ error: 'Google Account connection has expired. Please reconnect.', isVerified: false });
    }
    if (error.code === 403) {
      console.log(`[GSC API] 403 Access Denied for ${siteUrl}`);
      return res.status(403).json({ error: 'Access Denied. Make sure your Google Account has permission to view this property in GSC.' });
    }
    if (error.code === 401) {
      console.log(`[GSC API] 401 Token Expired for ${siteUrl}`);
      return res.status(401).json({ error: 'Google OAuth token expired or invalid. Please reconnect your account.' });
    }
    if (error.code === 429) {
      console.log(`[GSC API] 429 Quota Exceeded`);
      return res.status(429).json({ error: 'Google Search Console API quota exceeded. Please try again later.' });
    }

    console.error('[GSC API] Critical Error:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch data from Google Search Console' });
  }
});

module.exports = router;
