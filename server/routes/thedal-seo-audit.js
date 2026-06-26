const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenAI } = require('@google/genai');

const STOP_WORDS = new Set(["a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"]);

router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    const domain = new URL(targetUrl).hostname;

    // 1. Fetch the Website HTML
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);

    // ─── EXTRACT DATA ──────────────────────────────────────────────
    const title = $('title').text().trim() || '';
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
    
    const h1s = [];
    $('h1').each((_, el) => h1s.push($(el).text().trim()));
    const h2s = $('h2').length;
    
    let imagesWithoutAlt = 0;
    $('img').each((_, el) => {
      if (!$(el).attr('alt')) imagesWithoutAlt++;
    });

    const hasCanonical = $('link[rel="canonical"]').length > 0;
    const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
    const hasLang = $('html').attr('lang') !== undefined;
    
    const hasOgTitle = $('meta[property="og:title"]').length > 0;
    const hasOgImage = $('meta[property="og:image"]').length > 0;

    // Link Analysis
    let internalLinks = 0;
    let externalLinks = 0;
    let brokenLinks = 0;

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href === '#' || href.startsWith('javascript:')) {
        brokenLinks++;
      } else if (href.startsWith('/') || href.includes(domain)) {
        internalLinks++;
      } else if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        externalLinks++;
      }
    });

    // Extract Text & Keywords
    $('script, style, noscript, nav, footer, header').remove();
    let mainText = $('body').text().replace(/\s+/g, ' ').trim();
    
    const wordCount = mainText.split(' ').length;
    
    // Keyword Density (Top 5 words)
    const words = mainText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    const wordMap = {};
    for (const word of words) {
      if (word.length > 3 && !STOP_WORDS.has(word)) {
        wordMap[word] = (wordMap[word] || 0) + 1;
      }
    }
    const topKeywords = Object.entries(wordMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => ({ word: entry[0], count: entry[1] }));

    if (mainText.length > 10000) mainText = mainText.substring(0, 10000);

    // ─── CATEGORIZE CHECKS ──────────────────────────────────────────
    const categories = {
      onPage: { passed: [], failed: [], score: 100 },
      technical: { passed: [], failed: [], score: 100 },
      social: { passed: [], failed: [], score: 100 }
    };

    // On-Page Checks
    if (!title) categories.onPage.failed.push({ title: 'Missing Title Tag', description: 'The SEO title is missing. Ensure your page\'s title includes your target keywords, and design it to encourage users to click.' });
    else if (title.length < 30 || title.length > 60) categories.onPage.failed.push({ title: `Title tag length (${title.length}) is sub-optimal.`, description: 'Ensure your page\'s title is an optimal length (Recommended: 30-60 chars). Writing compelling titles is both a science and an art. Automated tools can analyze your title against known metrics for readability and click-worthiness.' });
    else categories.onPage.passed.push({ title: 'Optimal Title Tag', description: 'Your page title is a great length and likely includes your target keywords. This encourages users to click.' });

    if (!metaDescription) categories.onPage.failed.push({ title: 'Missing Meta Description', description: 'Write a meta description for your page. Use your target keywords in a natural way and write with human readers in mind. Summarize the content and stimulate reader interest.' });
    else if (metaDescription.length < 120 || metaDescription.length > 160) categories.onPage.failed.push({ title: `Meta Description length (${metaDescription.length}) is sub-optimal.`, description: 'Your description should ideally be between 120 and 160 characters to avoid truncation in search results while providing enough detail to stimulate reader interest.' });
    else categories.onPage.passed.push({ title: 'Optimal Meta Description', description: 'Your meta description has a good length and summarizes the content effectively.' });

    if (h1s.length === 0) categories.onPage.failed.push({ title: 'Missing H1 Tag', description: 'No H1 tag was found. For the best SEO results there should be exactly one H1 tag on each page. Ensure your most important keywords appear in the H1 tag.' });
    else if (h1s.length > 1) categories.onPage.failed.push({ title: `Multiple H1 Tags (${h1s.length}).`, description: 'Search engines use the H1 tag to understand the main topic of your page. Having multiple H1s can confuse them. Keep it to exactly one H1 tag per page.' });
    else categories.onPage.passed.push({ title: 'Exactly one H1 Tag', description: 'Great! You have exactly one H1 tag, making it clear to search engines what the main topic of the page is.' });

    if (h2s === 0) categories.onPage.failed.push({ title: 'Missing H2 tags.', description: 'Make sure you have a good balance of H2 tags to plain text in your content. Break the content down into logical sections, and use headings to introduce each new topic.' });
    else categories.onPage.passed.push({ title: `Found ${h2s} H2 tags`, description: 'Excellent. Breaking down content into logical sections with H2 tags makes it easier for users to read and for search engines to understand the structure.' });

    if (wordCount < 300) categories.onPage.failed.push({ title: `Thin content warning: Only ${wordCount} words.`, description: 'Search engines favor pages with substantial content. Try to aim for at least 300 words to provide enough depth and context for your topic.' });
    else categories.onPage.passed.push({ title: `Good content depth (${wordCount} words)`, description: 'Your page has sufficient content depth, which helps search engines understand the topic and rank it for relevant queries.' });

    // Technical Checks
    if (imagesWithoutAlt > 0) categories.technical.failed.push({ title: `${imagesWithoutAlt} images are missing 'alt' attributes.`, description: 'Make sure every image has an alt tag, and add useful descriptions to each image. Add your keywords or synonyms - but do it in a natural way.' });
    else categories.technical.passed.push({ title: 'All images have alt attributes.', description: 'Every image on the page has an alt tag. This is great for accessibility and helps search engines understand the content of the images.' });

    if (!hasCanonical) categories.technical.failed.push({ title: 'Missing Canonical Link tag.', description: 'Every page on your site should have a link with a rel="canonical" attribute. This helps prevent duplicate content issues by specifying the "correct" URL.' });
    else categories.technical.passed.push({ title: 'Canonical Link tag exists.', description: 'The page is using the canonical link tag, properly specifying the preferred version of the URL.' });

    if (!hasFavicon) categories.technical.failed.push({ title: 'Missing Favicon.', description: 'A favicon enhances your site\'s branding and visibility in browser tabs and bookmarks. Ensure you have a favicon configured.' });
    else categories.technical.passed.push({ title: 'Favicon is configured.', description: 'Your site properly defines a favicon for browsers and search engines to display.' });

    if (!hasLang) categories.technical.failed.push({ title: 'Missing HTML lang attribute.', description: 'The lang attribute specifies the language of the page content. This is important for screen readers and search engines to provide language-specific results.' });
    else categories.technical.passed.push({ title: 'HTML lang attribute exists.', description: 'The page properly declares its language, aiding in accessibility and international SEO.' });

    // Social Checks
    if (!hasOgTitle || !hasOgImage) categories.social.failed.push({ title: 'Missing Open Graph tags (og:title / og:image).', description: 'Insert customized Open Graph meta tags for each important page on your site. This controls how your page appears when shared on social networks like Facebook and LinkedIn.' });
    else categories.social.passed.push({ title: 'Open Graph tags are properly configured.', description: 'Your page has the necessary Open Graph tags, ensuring it looks great when shared on social media platforms.' });

    // Calculate Sub-Scores
    categories.onPage.score = Math.max(0, 100 - (categories.onPage.failed.length * 20));
    categories.technical.score = Math.max(0, 100 - (categories.technical.failed.length * 25));
    categories.social.score = Math.max(0, 100 - (categories.social.failed.length * 50));


    // ─── AI ANALYSIS ──────────────────────────────────────────────
    let aiRecommendations = [];
    let contentScore = 0;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `Act as an Expert SEO Auditor. Analyze the following text extracted from a website: "${targetUrl}".
Text content:
${mainText}

Evaluate the text based on:
1. Readability and User Intent
2. Keyword clarity (does it clearly state what they do?)
3. Content Depth

Provide your response in EXACTLY this JSON format (no markdown formatting, no code blocks, just raw JSON):
{
  "score": 85,
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}`;
        
        const genRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const textResponse = genRes.text.trim().replace(/^```json/, '').replace(/```$/, '');
        const aiData = JSON.parse(textResponse);
        contentScore = aiData.score || 0;
        aiRecommendations = aiData.recommendations || [];
      } catch (aiErr) {
        console.error('Gemini AI Error:', aiErr);
        aiRecommendations = ["AI Analysis unavailable. Ensure the Gemini API key is correct."];
      }
    } else {
      aiRecommendations = ["GEMINI_API_KEY not found in .env. Add it to enable AI Content Analysis."];
    }

    // ─── FINAL RESPONSE ───────────────────────────────────────────
    const overallScore = Math.round(
      (categories.onPage.score * 0.4) + 
      (categories.technical.score * 0.3) + 
      (contentScore * 0.3)
    );

    res.json({
      url: targetUrl,
      overallScore: Math.max(0, overallScore || 0),
      categories,
      aiContent: {
        score: contentScore,
        recommendations: aiRecommendations
      },
      links: {
        internal: internalLinks,
        external: externalLinks,
        broken: brokenLinks
      },
      keywords: topKeywords,
      serp: {
        title: title || 'Title missing',
        description: metaDescription || 'Description missing. Google will generate a random snippet from your page content here.'
      }
    });

  } catch (err) {
    console.error('SEO Audit Error:', err);
    res.status(500).json({ error: 'Failed to analyze website. Ensure the URL is accessible.' });
  }
});

module.exports = router;
