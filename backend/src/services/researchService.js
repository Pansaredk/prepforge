const { extractFromHtml } = require('../utils/htmlExtractor');
const { validateCompanyUrl } = require('../utils/urlValidator');
const { classifyWebsite, STATUS_MESSAGES } = require('../utils/companyWebsiteValidator');

const RELEVANCE_KEYWORDS = [
  'about', 'company', 'careers', 'jobs', 'hiring', 'team', 'values', 'culture', 'mission'
];

/**
 * Fetches a single webpage safely with timeout and User-Agent
 */
async function fetchPage(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PrepForgeCrawler/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Unsupported Content-Type: ${contentType}`);
    }

    const html = await response.text();
    return { success: true, html, finalUrl: response.url || url };
  } catch (err) {
    clearTimeout(timeoutId);
    return { success: false, error: err.message };
  }
}

/**
 * Scores and ranks discovered links based on relevance keywords
 */
function rankLinks(links, baseUrl) {
  let baseHostname = '';
  try {
    baseHostname = new URL(baseUrl).hostname;
  } catch {
    return [];
  }

  const scored = [];
  const seen = new Set([baseUrl]);

  for (const link of links) {
    if (seen.has(link.url)) continue;
    seen.add(link.url);

    try {
      const linkUrl = new URL(link.url);
      // Only crawl same domain or subdomains
      if (!linkUrl.hostname.endsWith(baseHostname)) {
        continue;
      }

      let score = 0;
      const lowerUrl = link.url.toLowerCase();
      const lowerText = (link.text || '').toLowerCase();

      for (const kw of RELEVANCE_KEYWORDS) {
        if (lowerUrl.includes(kw)) score += 3;
        if (lowerText.includes(kw)) score += 2;
      }

      if (score > 0) {
        scored.push({ url: link.url, score });
      }
    } catch {
      // Invalid URL skipped
    }
  }

  // Sort descending by relevance score
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map((item) => item.url);
}

/**
 * Performs bounded company research starting from companyUrl
 * @param {string} companyUrl
 * @returns {Promise<{ sources: Array<{ url: string, title: string, status: string }>, errors: string[], combinedText: string, publicDiscussion: { available: boolean, sources: string[] } }>}
 */
async function researchCompany(companyUrl) {
  const sources = [];
  const errors = [];
  let combinedText = '';

  // 1. URL syntax and SSRF check
  const validation = validateCompanyUrl(companyUrl);
  if (!validation.valid) {
    errors.push(`URL validation failed: ${validation.error}`);
    errors.push(STATUS_MESSAGES.INVALID);
    sources.push({ url: companyUrl || '', title: '', status: 'INVALID' });
    return {
      status: 'INVALID',
      statusMessage: STATUS_MESSAGES.INVALID,
      reason: validation.error || 'Invalid URL or SSRF target',
      signals: [],
      sources,
      errors,
      combinedText: '',
      publicDiscussion: { available: false, sources: [] }
    };
  }

  const normalizedUrl = validation.normalizedUrl;

  // 2. Safely fetch main page
  const mainResult = await fetchPage(normalizedUrl, 5000);

  // 3. Classify website content & reachability
  const validationResult = classifyWebsite({
    fetchResult: mainResult,
    targetUrl: normalizedUrl
  });

  if (validationResult.status === 'INVALID') {
    // Record explicit research error
    errors.push(`Website validation failed: ${validationResult.message} (${validationResult.reason})`);
    sources.push({
      url: (mainResult && mainResult.finalUrl) || normalizedUrl,
      title: validationResult.extracted?.title || '',
      status: 'INVALID'
    });
    // Do not attempt to crawl subpages on invalid sites
  } else if (validationResult.status === 'UNCERTAIN') {
    sources.push({
      url: (mainResult && mainResult.finalUrl) || normalizedUrl,
      title: validationResult.extracted?.title || 'Home',
      status: 'UNCERTAIN'
    });
    combinedText += `\n--- SOURCE: ${mainResult.finalUrl || normalizedUrl} (${validationResult.extracted?.title || 'Home'}) ---\n${validationResult.extracted?.text || ''}\n`;
  } else {
    // VALID
    sources.push({
      url: (mainResult && mainResult.finalUrl) || normalizedUrl,
      title: validationResult.extracted?.title || 'Home',
      status: 'VALID'
    });
    combinedText += `\n--- SOURCE: ${mainResult.finalUrl || normalizedUrl} (${validationResult.extracted?.title || 'Home'}) ---\n${validationResult.extracted?.text || ''}\n`;

    // Discover and crawl up to 2 high-value subpages (careers, about, etc.)
    const topSublinks = rankLinks(validationResult.extracted?.links || [], mainResult.finalUrl || normalizedUrl);
    for (const subUrl of topSublinks) {
      const subValidation = validateCompanyUrl(subUrl);
      if (!subValidation.valid) continue;

      const subResult = await fetchPage(subValidation.normalizedUrl, 5000);
      if (subResult.success) {
        const subExtracted = extractFromHtml(subResult.html, subResult.finalUrl);
        sources.push({
          url: subResult.finalUrl,
          title: subExtracted.title || 'Page',
          status: 'VALID'
        });
        combinedText += `\n--- SOURCE: ${subResult.finalUrl} (${subExtracted.title}) ---\n${subExtracted.text}\n`;
      } else {
        errors.push(`Subpage failed ${subUrl}: ${subResult.error}`);
        sources.push({
          url: subUrl,
          title: '',
          status: 'INVALID'
        });
      }
    }
  }

  // 4. Lightweight public interview discussion stub
  const publicDiscussion = {
    available: false,
    sources: []
  };

  return {
    status: validationResult.status,
    statusMessage: validationResult.message,
    reason: validationResult.reason,
    signals: validationResult.signals || [],
    sources,
    errors,
    combinedText: combinedText.trim(),
    publicDiscussion
  };
}

module.exports = {
  researchCompany
};
