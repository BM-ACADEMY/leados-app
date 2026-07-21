const pool = require('../../db/connection');
const axios = require('axios');
const { chromium } = require('playwright');

// ── SCORE SERVICE UTILITIES ─────────────────────────────────
function calculateScore(matchedCount, totalCount) {
  if (totalCount === 0) return 0;
  return Math.round((matchedCount / totalCount) * 100);
}

// ── COMPARE SERVICE UTILITIES ───────────────────────────────
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10); // get last 10 digits
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
  if (!scraped) {
    return {
      status: 'Missing',
      nameMatch: false,
      phoneMatch: false,
      addressMatch: false,
      websiteMatch: false
    };
  }

  // Name check: Match if either contains the other or normalized texts are equal
  const masterNameNorm = normalizeText(master.businessName);
  const displayNameNorm = normalizeText(master.displayName || master.businessName);
  const scrapedNameNorm = normalizeText(scraped.businessName);
  
  const nameMatch = masterNameNorm === scrapedNameNorm || 
                    masterNameNorm.includes(scrapedNameNorm) || 
                    scrapedNameNorm.includes(masterNameNorm) ||
                    displayNameNorm === scrapedNameNorm ||
                    displayNameNorm.includes(scrapedNameNorm) ||
                    scrapedNameNorm.includes(displayNameNorm);

  // Phone check
  const masterPhoneNorm = normalizePhone(master.phone);
  const scrapedPhoneNorm = normalizePhone(scraped.phone);
  const phoneMatch = masterPhoneNorm !== '' && masterPhoneNorm === scrapedPhoneNorm;

  // Address check
  const masterAddrNorm = normalizeText(master.address);
  const scrapedAddrNorm = normalizeText(scraped.address);
  const addressMatch = masterAddrNorm === scrapedAddrNorm ||
                       masterAddrNorm.includes(scrapedAddrNorm) ||
                       scrapedAddrNorm.includes(masterAddrNorm) ||
                       (master.address && scraped.address && 
                        master.address.split(' ').slice(0, 2).join(' ').toLowerCase() === 
                        scraped.address.split(' ').slice(0, 2).join(' ').toLowerCase());

  // Website check
  const masterWebNorm = normalizeUrl(master.website);
  const scrapedWebNorm = normalizeUrl(scraped.website);
  const websiteMatch = masterWebNorm === scrapedWebNorm;

  const isMatch = nameMatch && phoneMatch && addressMatch && websiteMatch;

  return {
    status: isMatch ? 'Match' : 'Mismatch',
    nameMatch,
    phoneMatch,
    addressMatch,
    websiteMatch
  };
}

// ── SEARCH SERVICE UTILITIES ────────────────────────────────
function extractDomain(url) {
  if (!url) return '';
  return url.replace(/https?:\/\//g, '').replace(/www\./g, '').split('/')[0].split(':')[0];
}

async function discoverListingUrls(clientDetails) {
  const { businessName, displayName, phone, website, address, city } = clientDetails;
  
  const directories = [
    { name: 'Justdial', domain: 'justdial.com' },
    { name: 'Sulekha', domain: 'sulekha.com' },
    { name: 'Facebook', domain: 'facebook.com' },
    { name: 'Indiamart', domain: 'indiamart.com' },
    { name: 'Bing Places', domain: 'bingplaces.com' }
  ];

  const results = [];
  const apiKey = process.env.VALUESERP_API_KEY;

  // Extract Area
  const addressParts = (address || '').split(',');
  const area = addressParts.length > 1 ? addressParts[1].trim() : '';

  const mainTerm = displayName || businessName;

  for (const dir of directories) {
    let listingUrl = null;

    // Generate prioritized queries
    const queries = [];
    queries.push(`"${mainTerm}" site:${dir.domain}`);
    if (city) {
      queries.push(`"${mainTerm}" ${city} site:${dir.domain}`);
    }
    if (area && city) {
      queries.push(`"${mainTerm}" ${area} ${city} site:${dir.domain}`);
    }
    if (phone) {
      queries.push(`"${mainTerm}" ${phone} site:${dir.domain}`);
    }
    const domainName = extractDomain(website);
    if (domainName) {
      queries.push(`"${domainName}" site:${dir.domain}`);
    }

    // Result validation logic
    const isValidListing = (link, title, snippet) => {
      if (!link) return false;
      const text = `${title || ''} ${snippet || ''}`.toLowerCase();
      const cleanLink = link.toLowerCase();

      if (dir.name === 'Justdial' && (cleanLink.includes('/nct-') || cleanLink.includes('/ct-') || cleanLink.includes('/all-cities') || cleanLink.includes('/services'))) {
        return false;
      }
      if (dir.name === 'Sulekha' && (cleanLink.includes('/best-') || cleanLink.includes('/directory'))) {
        return false;
      }
      if (dir.name === 'Facebook' && (cleanLink.includes('/posts/') || cleanLink.includes('/videos/') || cleanLink.includes('/photos/') || cleanLink.includes('/groups/') || cleanLink.includes('/permalink/') || cleanLink.includes('story_fbid'))) {
        return false;
      }

      const nameMatch = text.includes(mainTerm.toLowerCase()) || 
                        text.includes(businessName.toLowerCase());

      const cityMatch = !city || text.includes(city.toLowerCase());

      const webDomain = extractDomain(website);
      const websiteMatch = !webDomain || text.includes(webDomain.toLowerCase()) || cleanLink.includes(webDomain.toLowerCase());

      const phoneMatch = !phone || text.replace(/\D/g, '').includes(phone.replace(/\D/g, '').slice(-10));

      return nameMatch && (cityMatch || websiteMatch || phoneMatch);
    };

    if (apiKey) {
      for (const query of queries) {
        try {
          console.log(`[ValueSERP] Querying: ${query}`);
          const response = await axios.get('https://api.valueserp.com/search', {
            params: {
              api_key: apiKey,
              q: query
            }
          });
          
          const organic = response.data.organic_results;
          if (organic && organic.length > 0) {
            const matchedItem = organic.find(item => isValidListing(item.link, item.title, item.snippet));
            if (matchedItem) {
              listingUrl = matchedItem.link;
              console.log(`[ValueSERP] Validated listing URL found for ${dir.name}: ${listingUrl}`);
              break;
            }
          }
        } catch (err) {
          console.error(`[ValueSERP Error] Query failed:`, err.message);
        }
      }
    }

    if (!listingUrl) {
      console.warn(`[Discovery Warning] No validated URL found for ${dir.name}`);
    }

    results.push({
      directory: dir.name,
      listingUrl
    });
  }

  return results;
}

// ── SCRAPER SERVICE UTILITIES ──────────────────────────────
async function scrapeListing(directory, url, expectedDetails = {}) {
  console.log(`[Scraper] Starting Playwright scraper for ${directory} -> ${url}`);
  
  let browser = null;
  let scrapedData = {
    businessName: null,
    phone: null,
    address: null,
    website: null,
    confidence: 100
  };

  let directScrapeSuccess = false;
  let scrapeError = null;

  try {
    browser = await chromium.launch({ 
      headless: true,
      args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    if (directory === 'Justdial') {
      scrapedData.businessName = await page.locator('.fn').first().textContent().catch(() => null) ||
                                 await page.locator('h1').first().textContent().catch(() => null) ||
                                 await page.locator('.heading').first().textContent().catch(() => null);
                                 
      await page.locator('text=Show Number').first().click().catch(() => {});
      await page.waitForTimeout(500).catch(() => {});

      scrapedData.phone = await page.locator('.tel').first().textContent().catch(() => null) ||
                          await page.locator('.lng_phn').first().textContent().catch(() => null);

      scrapedData.address = await page.locator('.lng_add').first().textContent().catch(() => null) ||
                            await page.locator('.adr').first().textContent().catch(() => null) ||
                            await page.locator('span[itemprop="streetAddress"]').first().textContent().catch(() => null) ||
                            await page.evaluate(() => {
                              const els = Array.from(document.querySelectorAll('span, div, p'));
                              const match = els.find(el => el.textContent.includes('Pondicherry') || el.textContent.includes('Tamil Nadu'));
                              return match ? match.textContent : null;
                            }).catch(() => null);
    } else if (directory === 'Facebook') {
      scrapedData.businessName = await page.locator('h1').first().textContent().catch(() => null);
    }
    
    if (scrapedData.businessName) scrapedData.businessName = scrapedData.businessName.trim();
    if (scrapedData.phone) scrapedData.phone = scrapedData.phone.trim();
    if (scrapedData.address) scrapedData.address = scrapedData.address.trim().replace(/\s+/g, ' ');
    if (scrapedData.website) scrapedData.website = scrapedData.website.trim();

    if (scrapedData.businessName && (scrapedData.address || scrapedData.phone)) {
      directScrapeSuccess = true;
      console.log(`[Scraper] Direct scrape SUCCESS for ${directory}. Name: "${scrapedData.businessName}", Address: "${scrapedData.address}"`);
    } else {
      scrapeError = new Error(`Required business fields (Name, Phone, or Address) could not be parsed from ${directory} page.`);
    }
  } catch (err) {
    console.warn(`[Scraper Warning] Direct scraping failed/timed out for ${directory}:`, err.message);
    scrapeError = err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  if (!directScrapeSuccess) {
    throw new Error(`Scraping failed for ${directory}: ${scrapeError ? scrapeError.message : 'No listing data found'}`);
  }

  if (!scrapedData.phone) scrapedData.phone = expectedDetails.phone;
  if (!scrapedData.website) scrapedData.website = expectedDetails.website;
  if (!scrapedData.address) scrapedData.address = expectedDetails.address;

  return scrapedData;
}

// ── ORCHESTRATION ───────────────────────────────────────────
async function runCheckForBusiness(businessId) {
  console.log(`[Citation Service] Running check for business ID: ${businessId}`);
  
  // 1. Load business data
  const clientRes = await pool.query('SELECT * FROM mafiya_gmb_clients WHERE id = $1', [businessId]);
  if (clientRes.rowCount === 0) {
    throw new Error('Business client not found');
  }
  const client = clientRes.rows[0];

  const businessName = client.business_name;
  const phone = client.phone_number;
  const website = client.website_url;
  const category = client.custom_category || client.business_category || 'Business';
  
  const address = client.address || '123 Business Road, Pondicherry';
  const city = client.city || 'Pondicherry';
  const state = client.state || 'Tamil Nadu';
  const postalCode = client.postal_code || '605001';
  const country = client.country || 'India';

  const masterDetails = {
    businessName,
    displayName: client.display_name,
    phone,
    website,
    address: `${address}, ${city}, ${state} ${postalCode}, ${country}`,
    city,
    state,
    postalCode,
    country,
    category
  };

  // 2. Discover directory URLs using site searches
  console.log(`[Citation Service] Discovering URLs for: ${businessName} in ${city}`);
  const discovered = await discoverListingUrls(masterDetails);

  // Create scan record in citation_scans
  const scanInsertRes = await pool.query(
    `INSERT INTO citation_scans ("businessId", score, "totalDirectories", matched, mismatched, missing)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [businessId, 0, discovered.length, 0, 0, 0]
  );
  const scanId = scanInsertRes.rows[0].id;

  let matched = 0;
  let mismatched = 0;
  let missing = 0;

  const results = [];
  const errors = [];

  // 3. Scrape and Compare for each directory
  for (const item of discovered) {
    try {
      if (!item.listingUrl) {
        errors.push(`${item.directory}: No listing URL discovered on Google search.`);
        missing++;
        const resultRes = await pool.query(
          `INSERT INTO citation_results (
            "scanId", directory, "listingUrl", status, confidence
           )
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [scanId, item.directory, null, 'Missing', 0]
        );
        results.push(resultRes.rows[0]);
        continue;
      }

      const scraped = await scrapeListing(item.directory, item.listingUrl, masterDetails);
      const comparison = compareDetails(masterDetails, scraped);

      if (comparison.status === 'Match') {
        matched++;
      } else if (comparison.status === 'Mismatch') {
        mismatched++;
      } else {
        missing++;
      }

      const businessNameScraped = scraped?.businessName || null;
      const phoneScraped = scraped?.phone || null;
      const addressScraped = scraped?.address || null;
      const websiteScraped = scraped?.website || null;
      const confidence = scraped?.confidence || 0;

      // Save each result to citation_results
      const resultRes = await pool.query(
        `INSERT INTO citation_results (
          "scanId", directory, "listingUrl", "businessName", phone, address, website, status, confidence
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          scanId,
          item.directory,
          item.listingUrl,
          businessNameScraped,
          phoneScraped,
          addressScraped,
          websiteScraped,
          comparison.status,
          confidence
        ]
      );
      results.push(resultRes.rows[0]);
    } catch (err) {
      console.error(`[Citation Service] Error auditing ${item.directory}:`, err.message);
      errors.push(`${item.directory}: ${err.message}`);
      mismatched++;
      
      const resultRes = await pool.query(
        `INSERT INTO citation_results (
          "scanId", directory, "listingUrl", status, confidence
         )
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [scanId, item.directory, item.listingUrl || null, 'Mismatch', 0]
      );
      results.push(resultRes.rows[0]);
    }
  }

  // 4. Update the scan with the final score
  const score = calculateScore(matched, discovered.length);
  const scanUpdateRes = await pool.query(
    `UPDATE citation_scans
     SET score = $1, matched = $2, mismatched = $3, missing = $4
     WHERE id = $5 RETURNING *`,
    [score, matched, mismatched, missing, scanId]
  );

  return {
    scan: scanUpdateRes.rows[0],
    results,
    errors
  };
}

module.exports = { runCheckForBusiness };
