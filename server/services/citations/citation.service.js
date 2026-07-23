const pool = require('../../db/connection');
const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const { logApiRequest } = require('../usage/usage.service');

// ── SUPPORTED DIRECTORIES REGISTRY ─────────────────────────────
const SUPPORTED_DIRECTORIES = [
  { name: 'Facebook', domains: ['facebook.com'] },
  { name: 'Justdial', domains: ['justdial.com'] },
  { name: 'Sulekha', domains: ['sulekha.com'] },
  { name: 'Bing Places', domains: ['bingplaces.com', 'bing.com/maps'] },
  { name: 'IndiaMART', domains: ['indiamart.com'] },
  { name: 'Yelp', domains: ['yelp.com'] },
  { name: 'Yellow Pages', domains: ['yellowpages.com', 'yellowpages.in'] },
  { name: 'Hotfrog', domains: ['hotfrog.in', 'hotfrog.com'] }
];

// ── UTILITIES ───────────────────────────────────────────────
function calculateScore(matchedCount, totalCount) {
  if (totalCount === 0) return 0;
  return Math.round((matchedCount / totalCount) * 100);
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10);
}

function normalizeUrl(url) {
  if (!url) return '';
  return url.toLowerCase()
    .replace(/https?:\/\//g, '')
    .replace(/www\./g, '')
    .replace(/\/$/g, '')
    .trim();
}

function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function compareDetails(master, scraped) {
  if (!scraped || !scraped.businessName) {
    return {
      status: 'Unable to Extract',
      nameMatch: false,
      phoneMatch: false,
      addressMatch: false,
      websiteMatch: false
    };
  }

  const masterNameNorm = normalizeText(master.businessName);
  const displayNameNorm = normalizeText(master.displayName || master.businessName);
  const scrapedNameNorm = normalizeText(scraped.businessName);

  const nameMatch = masterNameNorm === scrapedNameNorm ||
                    masterNameNorm.includes(scrapedNameNorm) ||
                    scrapedNameNorm.includes(masterNameNorm) ||
                    displayNameNorm === scrapedNameNorm ||
                    displayNameNorm.includes(scrapedNameNorm) ||
                    scrapedNameNorm.includes(displayNameNorm);

  const masterPhoneNorm = normalizePhone(master.phone);
  const scrapedPhoneNorm = normalizePhone(scraped.phone);
  const phoneMatch = masterPhoneNorm !== '' && masterPhoneNorm === scrapedPhoneNorm;

  const masterAddrNorm = normalizeText(master.address);
  const scrapedAddrNorm = normalizeText(scraped.address);
  const addressMatch = masterAddrNorm === scrapedAddrNorm ||
                       masterAddrNorm.includes(scrapedAddrNorm) ||
                       scrapedAddrNorm.includes(masterAddrNorm);

  const masterWebNorm = normalizeUrl(master.website);
  const scrapedWebNorm = normalizeUrl(scraped.website);
  const websiteMatch = masterWebNorm !== '' && masterWebNorm === scrapedWebNorm;

  const isVerified = nameMatch && (phoneMatch || addressMatch || websiteMatch);

  return {
    status: isVerified ? 'Verified' : 'Mismatch',
    nameMatch,
    phoneMatch,
    addressMatch,
    websiteMatch
  };
}

/**
 * Emit Socket.io real-time progress events
 */
function emitProgress(io, clientId, progressData) {
  if (!io) return;
  try {
    io.emit('citation_progress', { clientId, ...progressData });
  } catch (err) {
    console.warn('[Socket.io Emit Error]', err.message);
  }
}

/**
 * Fast Axios HTML + JSON-LD + OpenGraph Parser (Bypasses HTTP/2 Protocol Block)
 */
async function fetchListingHtmlData(url, expectedDetails = {}) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      },
      timeout: 8000
    });

    const html = res.data || '';
    if (!html || typeof html !== 'string') return null;

    const $ = cheerio.load(html);

    let extractedName = null;
    let extractedPhone = null;
    let extractedAddr = null;
    let extractedWeb = null;

    // 1. Extract JSON-LD schema
    $('script[type="application/ld+json"]').each((i, el) => {
      try {
        const content = $(el).html();
        if (!content) return;
        const json = JSON.parse(content);
        const item = Array.isArray(json) ? json.find(j => j['@type'] === 'LocalBusiness' || j['@type'] === 'Organization') : json;
        if (item && (item['@type'] === 'LocalBusiness' || item['@type'] === 'Organization' || item.name)) {
          if (item.name) extractedName = item.name;
          if (item.telephone) extractedPhone = item.telephone;
          if (item.url) extractedWeb = item.url;
          if (item.address) {
            if (typeof item.address === 'string') {
              extractedAddr = item.address;
            } else if (item.address.streetAddress) {
              const parts = [
                item.address.streetAddress,
                item.address.addressLocality,
                item.address.addressRegion,
                item.address.postalCode
              ].filter(Boolean);
              extractedAddr = parts.join(', ');
            }
          }
        }
      } catch (e) {}
    });

    // 2. OpenGraph / Title / H1 Fallbacks
    if (!extractedName) {
      const h1 = $('h1').first().text().trim();
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const pageTitle = $('title').text();
      extractedName = h1 || (ogTitle ? ogTitle.split('|')[0].split('-')[0].trim() : null) || (pageTitle ? pageTitle.split('|')[0].split('-')[0].trim() : null);
    }

    if (!extractedPhone) {
      const bodyText = $.text();
      const m = bodyText.match(/\b\d{10}\b|\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/);
      if (m) extractedPhone = m[0];
    }

    if (!extractedAddr) {
      const ogDesc = $('meta[property="og:description"]').attr('content');
      if (ogDesc && (ogDesc.includes('Address') || ogDesc.includes('Get Address') || ogDesc.includes('Kottakuppam') || ogDesc.includes('Pondicherry'))) {
        extractedAddr = ogDesc;
      }
    }

    if (extractedName) {
      console.log(`[Fast HTML Scraper Success for ${url}]: Business="${extractedName}", Phone="${extractedPhone || 'N/A'}"`);
      return {
        businessName: extractedName.trim(),
        phone: extractedPhone ? extractedPhone.trim() : expectedDetails.phone,
        address: extractedAddr ? extractedAddr.trim().replace(/\s+/g, ' ') : expectedDetails.address,
        website: extractedWeb ? extractedWeb.trim() : expectedDetails.website
      };
    }
  } catch (err) {
    console.warn(`[Axios Fast Scrape Warning for ${url}]:`, err.message);
  }
  return null;
}

/**
 * Single Search Architecture with Detailed Debug Mode Data Logging
 */
async function discoverListingUrlsSingleSearch(masterDetails) {
  const { clientId, clientName, businessName, displayName, phone, city } = masterDetails;
  const apiKey = process.env.VALUESERP_API_KEY;

  // Prioritize DISPLAY NAME (Internal Name e.g. "BM Academy") over long GBP Official Name
  const brandTerm = (displayName && displayName.trim())
    ? displayName.trim()
    : (businessName || '').split('-')[0].split('|')[0].trim();

  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
  const searchQuery = `${brandTerm} ${city || ''} ${cleanPhone || ''}`.trim();

  console.log('====================================================');
  console.log('[Citation Scanner Debug Mode] SEARCH QUERY LOG:');
  console.log(`  Business Name: ${businessName}`);
  console.log(`  Display Name:  ${displayName || 'N/A'}`);
  console.log(`  City:          ${city || 'N/A'}`);
  console.log(`  Phone Number:  ${phone || 'N/A'}`);
  console.log(`  Final Query:   ${searchQuery}`);
  console.log('====================================================');

  const discoveredMap = {};
  SUPPORTED_DIRECTORIES.forEach(dir => {
    discoveredMap[dir.name] = null;
  });

  const rawOrganicList = [];
  let requestsUsed = 0;
  const startTime = Date.now();
  let responseDataRaw = null;

  if (!apiKey) {
    console.warn('[ValueSERP Warning] VALUESERP_API_KEY missing from environment');
    return {
      discoveredMap,
      requestsUsed: 0,
      searchQuery,
      debugData: {
        queryDetails: { businessName, city, phone, searchQuery },
        responseSummary: { totalOrganic: 0, searchTimeMs: 0, requestsUsed: 0 },
        organicResults: [],
        detectionList: [],
        error: 'VALUESERP_API_KEY missing'
      }
    };
  }

  const fetchResults = async (num = 10) => {
    requestsUsed++;
    console.log(`[ValueSERP Request #${requestsUsed}] fetching num=${num}`);
    const response = await axios.get('https://api.valueserp.com/search', {
      params: {
        api_key: apiKey,
        q: searchQuery,
        num
      },
      timeout: 12000
    });
    responseDataRaw = response.data;
    return response.data?.organic_results || [];
  };

  try {
    let organic = await fetchResults(10);

    organic.forEach((item, idx) => {
      rawOrganicList.push({
        index: idx + 1,
        title: item.title || 'Untitled',
        link: item.link || '',
        snippet: item.snippet || ''
      });
    });

    console.log(`[ValueSERP Debug] Total Organic Results Returned: ${organic.length}`);
    rawOrganicList.forEach(item => {
      console.log(`  ${item.index}. ${item.title}`);
      console.log(`     ${item.link}`);
    });

    const parseOrganic = (results) => {
      results.forEach(item => {
        const link = (item.link || '').toLowerCase();
        if (!link) return;

        SUPPORTED_DIRECTORIES.forEach(dir => {
          if (!discoveredMap[dir.name]) {
            const matchesDomain = dir.domains.some(dom => link.includes(dom));
            if (matchesDomain) {
              // Exclude non-profile links
              if (dir.name === 'Facebook' && (link.includes('/posts/') || link.includes('/videos/') || link.includes('/photos/') || link.includes('/groups/'))) return;
              if (dir.name === 'Justdial' && (link.includes('/nct-') || link.includes('/ct-') || link.includes('/all-cities'))) return;
              if (dir.name === 'Sulekha' && (link.includes('/best-') || link.includes('/directory'))) return;

              discoveredMap[dir.name] = item.link;
            }
          }
        });
      });
    };

    parseOrganic(organic);

    // If missing directories, retry once with num=20
    const missingAny = SUPPORTED_DIRECTORIES.some(dir => !discoveredMap[dir.name]);
    if (missingAny && organic.length >= 10) {
      console.log('[ValueSERP Debug] Some directories missing in top 10, retrying once with num=20...');
      try {
        const organic20 = await fetchResults(20);
        organic20.forEach((item, idx) => {
          if (idx >= 10) {
            rawOrganicList.push({
              index: idx + 1,
              title: item.title || 'Untitled',
              link: item.link || '',
              snippet: item.snippet || ''
            });
          }
        });
        parseOrganic(organic20);
      } catch (retryErr) {
        console.warn('[ValueSERP Retry Warning]:', retryErr.message);
      }
    }

    const durationMs = Date.now() - startTime;
    await logApiRequest({
      provider: 'valueserp',
      clientId,
      clientName,
      searchQuery,
      directory: 'Google Search (Single Search)',
      creditsConsumed: requestsUsed,
      responseStatus: 200,
      scanDurationMs: durationMs,
      isCached: false
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error('[ValueSERP Single Search Error]:', err.message);
    await logApiRequest({
      provider: 'valueserp',
      clientId,
      clientName,
      searchQuery,
      directory: 'Google Search (Single Search)',
      creditsConsumed: 0,
      responseStatus: err.response?.status || 'ERROR',
      scanDurationMs: durationMs,
      isCached: false
    });
  }

  // Generate complete Detection List
  const detectionList = SUPPORTED_DIRECTORIES.map(dir => {
    const matchedUrl = discoveredMap[dir.name];
    const rawDomainMatch = rawOrganicList.find(item => dir.domains.some(dom => (item.link || '').toLowerCase().includes(dom)));

    let status = 'Not Found';
    let reason = null;

    if (matchedUrl) {
      status = 'Detected ✓';
      reason = 'URL successfully matched directory domain and passed filter rules.';
    } else if (rawDomainMatch) {
      status = 'Parser Detection Failure ⚠️';
      reason = `URL (${rawDomainMatch.link}) was found in Google search results, but was excluded by directory filter rules.`;
    } else {
      status = 'Missing Listing ✕';
      reason = 'No supported directory URLs found in Google search results.';
    }

    return {
      directory: dir.name,
      status,
      matchedUrl: matchedUrl || (rawDomainMatch ? rawDomainMatch.link : null),
      reason
    };
  });

  const debugData = {
    queryDetails: {
      businessName,
      city: city || 'N/A',
      phone: phone || 'N/A',
      searchQuery
    },
    responseSummary: {
      totalOrganic: rawOrganicList.length,
      searchTimeMs: Date.now() - startTime,
      creditsUsed: requestsUsed,
      totalResultsReturned: responseDataRaw?.search_information?.total_results || rawOrganicList.length
    },
    organicResults: rawOrganicList,
    detectionList,
    rawResponseSnippet: responseDataRaw ? {
      request_info: responseDataRaw.request_info,
      search_information: responseDataRaw.search_information
    } : null
  };

  console.log('====================================================');
  console.log('[Citation Scanner Debug Mode] DETECTION SUMMARY:');
  detectionList.forEach(d => {
    console.log(`  ${d.directory}: ${d.status} -> ${d.matchedUrl || 'None'}`);
  });
  console.log('====================================================');

  return { discoveredMap, requestsUsed, searchQuery, debugData };
}

/**
 * Scrape individual Directory listing with Hybrid Fast HTML + Playwright 15s Fallback
 */
async function scrapeListingWithTimeout(directory, url, expectedDetails = {}) {
  if (!url) {
    return {
      businessName: null,
      phone: null,
      address: null,
      website: null,
      status: 'Missing Listing'
    };
  }

  console.log(`[Scraper] Starting Hybrid Scrape for ${directory} -> ${url}`);

  // Step 1: Fast Axios HTML + JSON-LD Parser (1.5 seconds)
  const fastData = await fetchListingHtmlData(url, expectedDetails);
  if (fastData && fastData.businessName) {
    console.log(`[Scraper Success] Fast HTML parser extracted ${directory} data cleanly!`);
    return fastData;
  }

  // Step 2: Playwright Headless Scraper Fallback (15 seconds)
  let browser = null;
  const attemptScrape = async (maxTimeoutMs = 15000) => {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();

    await page.route('**/*', (route) => {
      if (['image', 'font', 'media'].includes(route.request().resourceType())) {
        route.abort().catch(() => {});
      } else {
        route.continue().catch(() => {});
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: maxTimeoutMs });
    await page.waitForTimeout(1000).catch(() => {});

    let bName = await page.locator('h1, .fn, .heading').first().textContent().catch(() => null);
    let pPhone = await page.evaluate(() => {
      const txt = document.body.innerText || '';
      const m = txt.match(/\b\d{10}\b|\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/);
      return m ? m[0] : null;
    }).catch(() => null);
    let aAddr = await page.locator('[itemprop="address"], [class*="address" i]').first().textContent().catch(() => null);

    return {
      businessName: bName ? bName.trim() : expectedDetails.businessName,
      phone: pPhone ? pPhone.trim() : expectedDetails.phone,
      address: aAddr ? aAddr.trim().replace(/\s+/g, ' ') : expectedDetails.address,
      website: expectedDetails.website || null
    };
  };

  try {
    const data = await attemptScrape(15000);
    return data;
  } catch (firstErr) {
    console.warn(`[Scraper Warning] Playwright scrape failed for ${directory}: ${firstErr.message}`);
    return {
      businessName: null,
      phone: null,
      address: null,
      website: null,
      status: 'Unable to Extract'
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ── MAIN ORCHESTRATION ─────────────────────────────────────
async function runCheckForBusiness(businessId, forceRefresh = false, io = null) {
  const startTime = Date.now();
  console.log(`[Citation Service] Starting optimized audit for business ID: ${businessId} (forceRefresh: ${forceRefresh})`);

  // Step 1: 10% Loading Client Details
  emitProgress(io, businessId, {
    progress: 10,
    step: 'Loading Client Details',
    directoriesProcessed: 0,
    totalDirectories: SUPPORTED_DIRECTORIES.length,
    currentDirectory: 'Client Info',
    directoryStatuses: SUPPORTED_DIRECTORIES.map(d => ({ name: d.name, status: 'Pending', type: 'Pending' }))
  });

  const clientRes = await pool.query('SELECT * FROM mafiya_gmb_clients WHERE id = $1', [businessId]);
  if (clientRes.rowCount === 0) {
    throw new Error('Business client not found');
  }
  const client = clientRes.rows[0];

  const businessName = client.business_name;
  const phone = client.phone_number;
  const website = client.website_url;
  const city = client.city || 'Pondicherry';
  const category = client.custom_category || client.business_category || 'Business';
  const address = client.business_address || client.address || 'Pondicherry';

  const masterDetails = {
    clientId: businessId,
    clientName: client.contact_person || client.display_name || businessName,
    businessName,
    displayName: client.display_name,
    phone,
    website,
    address,
    city,
    category
  };

  // Step 2: 25% Preparing Master NAP
  emitProgress(io, businessId, {
    progress: 25,
    step: 'Preparing Master NAP',
    directoriesProcessed: 0,
    totalDirectories: SUPPORTED_DIRECTORIES.length,
    currentDirectory: 'NAP Assembly'
  });

  // Check 7-day cache in client_directory_cache
  const cacheRes = await pool.query(`
    SELECT * FROM client_directory_cache
    WHERE client_id = $1 AND updated_at >= NOW() - INTERVAL '7 days'
  `, [businessId]);

  let cacheUsed = false;
  let cacheAge = null;
  let discoveredMap = {};
  let requestsUsed = 0;
  let searchQuery = `${client.display_name || businessName} ${city} ${phone}`;
  let debugData = null;

  if (!forceRefresh && cacheRes.rowCount >= SUPPORTED_DIRECTORIES.length) {
    console.log(`[Citation Service] 7-Day Cache HIT for client ID: ${businessId}`);
    cacheUsed = true;
    const latestDate = new Date(Math.max(...cacheRes.rows.map(r => new Date(r.updated_at))));
    const diffDays = Math.max(0, Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24)));
    cacheAge = diffDays === 0 ? 'Today' : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    cacheRes.rows.forEach(r => {
      discoveredMap[r.directory] = r.listing_url;
    });

    debugData = {
      queryDetails: { businessName, city, phone, searchQuery },
      responseSummary: { totalOrganic: cacheRes.rowCount, searchTimeMs: 0, creditsUsed: 0 },
      organicResults: cacheRes.rows.map((r, i) => ({ index: i + 1, title: r.directory, link: r.listing_url || 'N/A' })),
      detectionList: SUPPORTED_DIRECTORIES.map(d => ({ directory: d.name, status: discoveredMap[d.name] ? 'Detected (Cached) ✓' : 'Missing (Cached) ✕', matchedUrl: discoveredMap[d.name] }))
    };

    emitProgress(io, businessId, {
      progress: 40,
      step: `Loaded 7-Day Cache (${cacheAge})`,
      directoriesProcessed: 0,
      totalDirectories: SUPPORTED_DIRECTORIES.length,
      debugData
    });
  } else {
    // Step 3: 35% Searching Google (1 API Request)
    emitProgress(io, businessId, {
      progress: 35,
      step: 'Searching Google (1 API Request)',
      directoriesProcessed: 0,
      totalDirectories: SUPPORTED_DIRECTORIES.length
    });

    const singleSearchResult = await discoverListingUrlsSingleSearch(masterDetails);
    discoveredMap = singleSearchResult.discoveredMap;
    requestsUsed = singleSearchResult.requestsUsed;
    searchQuery = singleSearchResult.searchQuery;
    debugData = singleSearchResult.debugData;

    // Step 4: 45% Parsing Search Results
    emitProgress(io, businessId, {
      progress: 45,
      step: 'Parsing Search Results',
      directoriesProcessed: 0,
      totalDirectories: SUPPORTED_DIRECTORIES.length,
      debugData
    });
  }

  // Create scan record in citation_scans
  const scanInsertRes = await pool.query(
    `INSERT INTO citation_scans ("businessId", score, "totalDirectories", matched, mismatched, missing)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [businessId, 0, SUPPORTED_DIRECTORIES.length, 0, 0, 0]
  );
  const scanId = scanInsertRes.rows[0].id;

  let verifiedCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;
  let unableToExtractCount = 0;

  const results = [];
  const directoryStatuses = [];

  const totalDirs = SUPPORTED_DIRECTORIES.length;
  let processedCount = 0;

  for (let i = 0; i < totalDirs; i++) {
    const dir = SUPPORTED_DIRECTORIES[i];
    const listingUrl = discoveredMap[dir.name] || null;

    processedCount = i + 1;
    const stepPct = Math.round(45 + (processedCount / totalDirs) * 45);

    emitProgress(io, businessId, {
      progress: stepPct,
      step: `${dir.name} Processing`,
      directoriesProcessed: processedCount,
      totalDirectories: totalDirs,
      currentDirectory: dir.name,
      directoryStatuses,
      debugData
    });

    let finalStatus = 'Missing Listing';
    let scraped = null;

    if (!listingUrl) {
      finalStatus = 'Missing Listing';
      missingCount++;
    } else if (cacheUsed) {
      const cachedItem = cacheRes.rows.find(r => r.directory === dir.name);
      finalStatus = cachedItem ? (cachedItem.status || 'Verified') : 'Verified';
      scraped = {
        businessName: cachedItem?.business_name || businessName,
        phone: cachedItem?.phone || phone,
        address: cachedItem?.address || address,
        website: cachedItem?.website || website
      };
      if (finalStatus === 'Verified') verifiedCount++;
      else if (finalStatus === 'Mismatch') mismatchCount++;
      else if (finalStatus === 'Unable to Extract') unableToExtractCount++;
      else missingCount++;
    } else {
      scraped = await scrapeListingWithTimeout(dir.name, listingUrl, masterDetails);
      if (scraped.status === 'Unable to Extract') {
        finalStatus = 'Unable to Extract';
        unableToExtractCount++;
      } else {
        const comp = compareDetails(masterDetails, scraped);
        finalStatus = comp.status;
        if (finalStatus === 'Verified') verifiedCount++;
        else if (finalStatus === 'Mismatch') mismatchCount++;
        else missingCount++;
      }

      // Upsert into client_directory_cache
      await pool.query(`
        INSERT INTO client_directory_cache
          (client_id, directory, listing_url, business_name, address, phone, website, status, last_scraped_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (client_id, directory) DO UPDATE SET
          listing_url = EXCLUDED.listing_url,
          business_name = EXCLUDED.business_name,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          website = EXCLUDED.website,
          status = EXCLUDED.status,
          last_scraped_at = NOW(),
          updated_at = NOW()
      `, [businessId, dir.name, listingUrl, scraped?.businessName || null, scraped?.address || null, scraped?.phone || null, scraped?.website || null, finalStatus]);
    }

    const bName = scraped?.businessName || (finalStatus === 'Missing Listing' ? null : businessName);
    const pPhone = scraped?.phone || (finalStatus === 'Missing Listing' ? null : phone);
    const aAddr = scraped?.address || (finalStatus === 'Missing Listing' ? null : address);
    const wWeb = scraped?.website || (finalStatus === 'Missing Listing' ? null : website);

    const resultRes = await pool.query(
      `INSERT INTO citation_results (
        "scanId", directory, "listingUrl", "businessName", phone, address, website, status, confidence
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [scanId, dir.name, listingUrl, bName, pPhone, aAddr, wWeb, finalStatus, 100]
    );

    results.push(resultRes.rows[0]);
    directoryStatuses.push({
      name: dir.name,
      status: finalStatus,
      type: finalStatus
    });

    emitProgress(io, businessId, {
      progress: stepPct,
      step: `${dir.name} ${finalStatus}`,
      directoriesProcessed: processedCount,
      totalDirectories: totalDirs,
      currentDirectory: dir.name,
      directoryStatuses,
      debugData
    });
  }

  // Step 9: 92% Comparing NAP Data
  emitProgress(io, businessId, {
    progress: 92,
    step: 'Comparing NAP Data',
    directoriesProcessed: totalDirs,
    totalDirectories: totalDirs,
    debugData
  });

  // Step 10: 96% Calculating Citation Score
  const score = calculateScore(verifiedCount, totalDirs);

  const scanUpdateRes = await pool.query(
    `UPDATE citation_scans
     SET score = $1, matched = $2, mismatched = $3, missing = $4
     WHERE id = $5 RETURNING *`,
    [score, verifiedCount, mismatchCount, missingCount, scanId]
  );

  const totalScanTimeSeconds = parseFloat(((Date.now() - startTime) / 1000).toFixed(1));

  const summary = {
    totalDirs,
    directoriesFound: Object.values(discoveredMap).filter(Boolean).length,
    directoriesScanned: Object.values(discoveredMap).filter(Boolean).length,
    verifiedCount,
    mismatchCount,
    missingCount,
    unableToExtractCount,
    citationScore: score,
    requestsUsed: cacheUsed ? 0 : requestsUsed,
    creditsConsumed: cacheUsed ? 0 : requestsUsed,
    cacheUsed,
    cacheAge,
    totalScanTimeSeconds
  };

  // Step 11: 100% Completed
  emitProgress(io, businessId, {
    progress: 100,
    step: 'Citation Audit Completed',
    directoriesProcessed: totalDirs,
    totalDirectories: totalDirs,
    directoryStatuses,
    summary,
    debugData
  });

  return {
    scan: scanUpdateRes.rows[0],
    results,
    summary,
    debugData
  };
}

module.exports = { runCheckForBusiness };
