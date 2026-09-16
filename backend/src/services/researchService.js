const { extractFromHtml, normalizeUrl } = require('../utils/htmlExtractor');
const { validateCompanyUrl } = require('../utils/urlValidator');
const { classifyWebsite, STATUS_MESSAGES } = require('../utils/companyWebsiteValidator');

const HIRING_KEYWORDS = [
  'join our team',
  'we are hiring',
  'work with us',
  'join us',
  'open roles',
  'careers',
  'career',
  'jobs',
  'job',
  'hiring',
  'openings',
  'opportunities',
  'vacancies',
  'handbook',
  'engineering blog',
  'engineering-blog',
  'culture',
  'life at',
  'working here',
  'working-here',
  'people',
  'team'
];

const COMPANY_KEYWORDS = [
  'about us',
  'who we are',
  'our story',
  'our mission',
  'what we do',
  'company',
  'about',
  'overview',
  'leadership',
  'solutions',
  'platform',
  'technology'
];

// In-memory cache for robots.txt disallow rules per origin
const robotsCache = new Map();

/**
 * Checks whether a path is allowed by robots.txt
 * @param {string} targetUrl
 * @returns {Promise<boolean>}
 */
async function isPathAllowedByRobots(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const origin = parsed.origin;
    const pathname = parsed.pathname;

    if (!robotsCache.has(origin)) {
      const robotsUrl = `${origin}/robots.txt`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      try {
        const response = await fetch(robotsUrl, {
          headers: {
            'User-Agent': 'PrepForgeCrawler/1.0',
            'Accept': 'text/plain'
          },
          signal: controller.signal,
          redirect: 'follow'
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          const disallowed = [];
          const lines = text.split('\n');
          let appliesToUs = false;

          for (const line of lines) {
            const trimmed = line.trim();
            if (/^user-agent:\s*(\*|prepforgecrawler)/i.test(trimmed)) {
              appliesToUs = true;
            } else if (/^user-agent:/i.test(trimmed)) {
              appliesToUs = false;
            } else if (appliesToUs && /^disallow:\s*(.+)/i.test(trimmed)) {
              const rule = trimmed.replace(/^disallow:\s*/i, '').trim();
              if (rule && rule !== '/') {
                disallowed.push(rule);
              }
            }
          }
          robotsCache.set(origin, disallowed);
        } else {
          robotsCache.set(origin, []);
        }
      } catch {
        clearTimeout(timeoutId);
        robotsCache.set(origin, []);
      }
    }

    const disallowedRules = robotsCache.get(origin) || [];
    for (const rule of disallowedRules) {
      if (rule && pathname.startsWith(rule)) {
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Fetches a single webpage safely with timeout, exponential backoff retry on HTTP 429/5xx, and User-Agent
 * @param {string} url
 * @param {number} timeoutMs
 * @param {number} maxRetries
 * @returns {Promise<{ success: boolean, status?: number, html?: string, finalUrl?: string, error?: string }>}
 */
async function fetchPage(url, timeoutMs = 5000, maxRetries = 2) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
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

      // Handle HTTP 429 Rate Limit with exponential backoff
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const retryAfterHeader = response.headers.get('retry-after');
          let waitMs = 500 * Math.pow(2, attempt); // 500ms, 1000ms
          if (retryAfterHeader) {
            const parsedWait = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedWait) && parsedWait > 0) {
              waitMs = Math.min(parsedWait * 1000, 3000);
            }
          }
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        return { success: false, status: 429, error: 'HTTP 429 Too Many Requests (Rate limited)' };
      }

      // Handle 5xx temporary server errors
      if (response.status >= 500 && response.status <= 504) {
        if (attempt < maxRetries) {
          const waitMs = 500 * Math.pow(2, attempt);
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        return { success: false, status: response.status, error: `HTTP ${response.status} ${response.statusText}` };
      }

      // Non-retryable HTTP errors (404, 403, 401)
      if (!response.ok) {
        return { success: false, status: response.status, error: `HTTP ${response.status} ${response.statusText}` };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return { success: false, status: response.status, error: `Unsupported Content-Type: ${contentType}` };
      }

      const html = await response.text();
      return { success: true, status: response.status, html, finalUrl: response.url || url };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      // Retry on network reset or socket timeout if attempts remain
      const isRetryable = /ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|fetch failed/i.test(err.message);
      if (isRetryable && attempt < maxRetries) {
        const waitMs = 500 * Math.pow(2, attempt);
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      return { success: false, error: err.message };
    }
  }

  return { success: false, error: (lastError && lastError.message) || 'Max retries exceeded' };
}

/**
 * Scores a discovered link for hiring relevance vs company overview relevance
 */
function scoreLink(link, baseUrl) {
  let baseHostname = '';
  try {
    baseHostname = new URL(baseUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }

  const rawUrl = normalizeUrl(link.url);
  const text = (link.text || '').toLowerCase().trim();

  let linkUrl;
  try {
    linkUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  const linkHostname = linkUrl.hostname.replace(/^www\./, '');
  // Keep same origin or subdomains
  if (linkHostname !== baseHostname && !linkHostname.endsWith(`.${baseHostname}`)) {
    return null;
  }

  const path = linkUrl.pathname.toLowerCase();

  let hiringScore = 0;
  let companyScore = 0;

  for (const kw of HIRING_KEYWORDS) {
    if (text.includes(kw)) hiringScore += 6;
    const cleanKw = kw.replace(/\s+/g, '-');
    if (path.includes(cleanKw) || path.includes(kw.replace(/\s+/g, '')) || path.includes(kw.replace(/\s+/g, '_'))) {
      hiringScore += 4;
    }
  }

  for (const kw of COMPANY_KEYWORDS) {
    if (text.includes(kw)) companyScore += 4;
    const cleanKw = kw.replace(/\s+/g, '-');
    if (path.includes(cleanKw) || path.includes(kw.replace(/\s+/g, '')) || path.includes(kw.replace(/\s+/g, '_'))) {
      companyScore += 3;
    }
  }

  return {
    url: rawUrl,
    text: link.text,
    hiringScore,
    companyScore,
    totalScore: hiringScore * 1.5 + companyScore
  };
}

/**
 * Discovers high-value company and hiring links dynamically from extracted links
 * @param {Array<{ url: string, text: string }>} links
 * @param {string} baseUrl
 * @returns {{ hiringCandidates: Array<{ url: string, score: number, text?: string }>, companyCandidates: Array<{ url: string, score: number, text?: string }> }}
 */
function categorizeLinks(links, baseUrl) {
  const normBase = normalizeUrl(baseUrl);
  const seen = new Set([normBase]);
  const hiring = [];
  const company = [];

  for (const link of links) {
    const scored = scoreLink(link, baseUrl);
    if (!scored) continue;
    if (seen.has(scored.url)) continue;
    seen.add(scored.url);

    if (scored.hiringScore > 0) {
      hiring.push({ url: scored.url, score: scored.hiringScore, text: scored.text });
    }
    if (scored.companyScore > 0) {
      company.push({ url: scored.url, score: scored.companyScore, text: scored.text });
    }
  }

  hiring.sort((a, b) => b.score - a.score);
  company.sort((a, b) => b.score - a.score);

  return { hiringCandidates: hiring, companyCandidates: company };
}

/**
 * Searches public interview discussions for the company without hardcoded mocks
 * @param {string} companyUrl
 * @param {string} companyTitle
 * @param {string} siteContent
 * @returns {Promise<{ available: boolean, sources: string[] }>}
 */
async function researchPublicDiscussion(companyUrl, companyTitle = '', siteContent = '') {
  const result = {
    available: false,
    sources: []
  };

  // 1. Check if the crawled company website itself features public interview guides / discussions
  const lowerContent = (siteContent || '').toLowerCase();
  const hasInternalInterviewProcess =
    /\b(?:our interview process|interview stages|what to expect in your interview|how we interview|technical interview process)\b/i.test(lowerContent);

  if (hasInternalInterviewProcess) {
    result.available = true;
    result.sources.push(companyUrl);
  }

  // 2. Derive company name from title or hostname
  let companyName = '';
  if (companyTitle) {
    const parts = companyTitle.split(/[-–—|:]/);
    companyName = parts[0].replace(/^(?:welcome to|careers at|working at|home -)\s+/i, '').trim();
  }
  if (!companyName) {
    try {
      const hostname = new URL(companyUrl).hostname.replace(/^www\./, '');
      const first = hostname.split('.')[0];
      companyName = first.charAt(0).toUpperCase() + first.slice(1);
    } catch {
      companyName = '';
    }
  }

  if (!companyName) {
    return result;
  }

  // 3. Attempt bounded public interview discussion retrieval via public API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const query = encodeURIComponent(`${companyName} interview`);
    const publicUrl = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=3`;

    const res = await fetch(publicUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PrepForgeCrawler/1.0 (Interview Research)'
      }
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.hits) && data.hits.length > 0) {
        const matchingHits = data.hits.filter((hit) => {
          const t = (hit.title || '').toLowerCase();
          return t.includes(companyName.toLowerCase()) || t.includes('interview');
        });

        if (matchingHits.length > 0) {
          result.available = true;
          for (const hit of matchingHits.slice(0, 3)) {
            const url = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
            if (!result.sources.includes(url)) {
              result.sources.push(url);
            }
          }
        }
      }
    }
  } catch {
    clearTimeout(timeoutId);
    // Graceful fallback: unavailable discussion never fails the run
  }

  return result;
}

/**
 * Performs bounded, dynamic company research starting from companyUrl
 * @param {string} companyUrl
 * @returns {Promise<{
 *   status: string,
 *   statusMessage: string,
 *   reason: string,
 *   signals: string[],
 *   company: { url: string, title: string, summary: string, sources: string[] },
 *   hiring: { found: boolean, url: string, title: string, summary: string, sources: string[] },
 *   publicDiscussion: { available: boolean, sources: string[] },
 *   sources: Array<{ url: string, title: string, status: string }>,
 *   errors: string[],
 *   combinedText: string
 * }>}
 */
async function researchCompany(companyUrl) {
  const sources = [];
  const errors = [];
  let combinedText = '';

  const companyData = {
    url: companyUrl || '',
    title: '',
    summary: '',
    sources: []
  };

  const hiringData = {
    found: false,
    url: '',
    title: '',
    summary: '',
    sources: []
  };

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
      company: companyData,
      hiring: hiringData,
      sources,
      errors,
      combinedText: '',
      publicDiscussion: { available: false, sources: [] }
    };
  }

  const normalizedUrl = validation.normalizedUrl;
  companyData.url = normalizedUrl;

  // 2. Safely fetch homepage with retry & exponential backoff
  const mainResult = await fetchPage(normalizedUrl, 5000, 2);

  // 3. Classify website content & reachability
  const validationResult = classifyWebsite({
    fetchResult: mainResult,
    targetUrl: normalizedUrl
  });

  if (validationResult.status === 'INVALID') {
    errors.push(`Website validation failed: ${validationResult.message} (${validationResult.reason})`);
    sources.push({
      url: (mainResult && mainResult.finalUrl) || normalizedUrl,
      title: validationResult.extracted?.title || '',
      status: 'INVALID'
    });
  } else {
    const isUncertain = validationResult.status === 'UNCERTAIN';
    const finalHomeUrl = (mainResult && mainResult.finalUrl) || normalizedUrl;
    const homeTitle = validationResult.extracted?.title || 'Home';
    const homeText = validationResult.extracted?.text || '';

    companyData.title = homeTitle;
    companyData.summary = validationResult.extracted?.metaDescription || homeText.slice(0, 300);
    companyData.sources.push(finalHomeUrl);

    sources.push({
      url: finalHomeUrl,
      title: homeTitle,
      status: isUncertain ? 'UNCERTAIN' : 'VALID'
    });

    combinedText += `\n--- SOURCE: ${finalHomeUrl} (${homeTitle}) ---\n${homeText}\n`;

    // 4. Dynamic subpage discovery (only for valid/uncertain sites, not invalid)
    const categorized = categorizeLinks(validationResult.extracted?.links || [], finalHomeUrl);
    let subpagesToCrawl = [];

    // Prioritize 1 hiring page and 1 company/about page
    const topHiring = categorized.hiringCandidates[0];
    const topCompany = categorized.companyCandidates.find((c) => !topHiring || c.url !== topHiring.url);

    if (topHiring) {
      subpagesToCrawl.push({ url: topHiring.url, type: 'hiring' });
    }
    if (topCompany) {
      subpagesToCrawl.push({ url: topCompany.url, type: 'company' });
    }

    // Depth-2 Discovery: If no hiring page was found on homepage, inspect top company/hub page
    let depth2HiringCandidate = null;

    for (const subpage of subpagesToCrawl) {
      // Politeness rate limiting delay (300ms) between page requests
      await new Promise((resolve) => setTimeout(resolve, 300));

      const subValidation = validateCompanyUrl(subpage.url);
      if (!subValidation.valid) continue;

      // Respect robots.txt
      const allowed = await isPathAllowedByRobots(subValidation.normalizedUrl);
      if (!allowed) {
        errors.push(`Crawling disallowed by robots.txt: ${subpage.url}`);
        continue;
      }

      const subResult = await fetchPage(subValidation.normalizedUrl, 5000, 1);
      if (subResult.success) {
        const subExtracted = extractFromHtml(subResult.html, subResult.finalUrl);
        const subTitle = subExtracted.title || 'Page';

        sources.push({
          url: subResult.finalUrl,
          title: subTitle,
          status: 'VALID'
        });

        combinedText += `\n--- SOURCE: ${subResult.finalUrl} (${subTitle}) ---\n${subExtracted.text}\n`;

        if (subpage.type === 'hiring') {
          hiringData.found = true;
          hiringData.url = subResult.finalUrl;
          hiringData.title = subTitle;
          hiringData.summary = subExtracted.metaDescription || subExtracted.text.slice(0, 300);
          hiringData.sources.push(subResult.finalUrl);
        } else {
          companyData.sources.push(subResult.finalUrl);

          // If we didn't have a hiring page yet, search this company/about/engineering hub page's links (Depth 2)
          if (!hiringData.found && !depth2HiringCandidate && subExtracted.links) {
            const depth2Categorized = categorizeLinks(subExtracted.links, subResult.finalUrl);
            if (depth2Categorized.hiringCandidates.length > 0) {
              depth2HiringCandidate = depth2Categorized.hiringCandidates[0].url;
            }
          }
        }
      } else {
        errors.push(`Subpage failed ${subpage.url}: ${subResult.error}`);
        sources.push({
          url: subpage.url,
          title: '',
          status: 'INVALID'
        });
      }
    }

    // Crawl depth-2 hiring link if discovered and limit not reached
    if (!hiringData.found && depth2HiringCandidate && sources.length < 3) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const depth2Val = validateCompanyUrl(depth2HiringCandidate);
      if (depth2Val.valid && (await isPathAllowedByRobots(depth2Val.normalizedUrl))) {
        const d2Result = await fetchPage(depth2Val.normalizedUrl, 5000, 1);
        if (d2Result.success) {
          const d2Extracted = extractFromHtml(d2Result.html, d2Result.finalUrl);
          const d2Title = d2Extracted.title || 'Careers';
          sources.push({
            url: d2Result.finalUrl,
            title: d2Title,
            status: 'VALID'
          });
          combinedText += `\n--- SOURCE: ${d2Result.finalUrl} (${d2Title}) ---\n${d2Extracted.text}\n`;
          hiringData.found = true;
          hiringData.url = d2Result.finalUrl;
          hiringData.title = d2Title;
          hiringData.summary = d2Extracted.metaDescription || d2Extracted.text.slice(0, 300);
          hiringData.sources.push(d2Result.finalUrl);
        }
      }
    }
  }

  // 5. Dynamic public interview discussion research
  const publicDiscussion = await researchPublicDiscussion(
    normalizedUrl,
    companyData.title,
    combinedText
  );

  return {
    status: validationResult.status,
    statusMessage: validationResult.message,
    reason: validationResult.reason,
    signals: validationResult.signals || [],
    company: companyData,
    hiring: hiringData,
    sources,
    errors,
    combinedText: combinedText.trim(),
    publicDiscussion
  };
}

module.exports = {
  fetchPage,
  isPathAllowedByRobots,
  categorizeLinks,
  researchPublicDiscussion,
  researchCompany
};
