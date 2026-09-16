/**
 * Company Website Validation & Classification Engine
 *
 * Provides deep heuristic validation of company websites beyond simple HTTP 200 responses:
 * - Syntax & SSRF validation
 * - Reachability & safe HTTP request handling
 * - Detection of parked domains, bot challenges, generic default pages, empty/tiny content
 * - Detection of genuine organizational signals (About, Products/Services, Contact, Careers, Team, Corporate entities)
 * - Three-tier classification:
 *   - VALID: "Website appears to be a reachable organization/company website."
 *   - INVALID: "Website could not be reached or does not appear to contain a meaningful company website."
 *   - UNCERTAIN: "Website is reachable, but there is not enough information to determine whether it represents the intended company."
 */

const { extractFromHtml } = require('./htmlExtractor');

const STATUS_MESSAGES = {
  VALID: 'Website appears to be a reachable organization/company website.',
  INVALID: 'Website could not be reached or does not appear to contain a meaningful company website.',
  UNCERTAIN: 'Website is reachable, but there is not enough information to determine whether it represents the intended company.'
};

// Patterns indicative of parked, expired, or domain-for-sale pages
const PARKED_DOMAIN_PATTERNS = [
  /\b(?:buy this domain|domain (?:is )?for sale|inquire about this domain)\b/i,
  /\b(?:is parked free|parked domain|parked page|domain parking)\b/i,
  /\b(?:godaddy|namecheap|sedo|dan\.com|hugedomains|afternic)\b/i,
  /\b(?:this domain may be for sale|this web page is parked|purchase this domain)\b/i,
  /\b(?:make an offer on this domain|renew this domain|domain has expired|pending renewal)\b/i,
  /\b(?:this domain is registered|domain registered at|find your domain)\b/i
];

// Patterns indicative of default web server installations or maintenance pages
const DEFAULT_SERVER_PATTERNS = [
  /\b(?:default web site page|iis windows server|apache2 ubuntu default page)\b/i,
  /\b(?:welcome to nginx|default apache page|test page for apache|welcome to openresty)\b/i,
  /\b(?:cpanel default page|website is under construction|website under maintenance|coming soon page)\b/i
];

// Patterns indicative of bot challenge, WAF, or verification walls
const BOT_CHALLENGE_PATTERNS = [
  /\b(?:just a moment\.\.\.|attention required!|security check|are you a robot|bot detection)\b/i,
  /\b(?:please enable cookies|verify you are human|checking your browser|ray id:)\b/i,
  /\b(?:cloudflare ray id|ddos-guard|sucuri webproxy)\b/i
];

// Patterns indicative of dummy, mock, or placeholder content
const PLACEHOLDER_PATTERNS = [
  /\b(?:lorem ipsum dolor sit amet|consectetur adipiscing elit)\b/i,
  /\b(?:example\.com domain|this domain is established to be used for illustrative examples)\b/i
];

/**
 * Classifies fetched webpage content to determine whether it represents a real organization/company.
 * @param {object} params
 * @param {{ success: boolean, html?: string, finalUrl?: string, error?: string, status?: number }} params.fetchResult
 * @param {string} params.targetUrl
 * @returns {{
 *   valid: boolean,
 *   status: 'VALID' | 'INVALID' | 'UNCERTAIN',
 *   message: string,
 *   reason: string,
 *   score: number,
 *   signals: string[],
 *   extracted: object
 * }}
 */
function classifyWebsite({ fetchResult, targetUrl }) {
  // 1. Check reachability failure
  if (!fetchResult || !fetchResult.success) {
    const rawError = (fetchResult && fetchResult.error) || 'Failed to reach host';
    let detailedReason = rawError;

    if (/ENOTFOUND|getaddrinfo/i.test(rawError)) {
      detailedReason = 'Domain name could not be resolved (DNS failure)';
    } else if (/timeout|aborted/i.test(rawError)) {
      detailedReason = 'Request timed out after 5000ms';
    } else if (/ECONNREFUSED/i.test(rawError)) {
      detailedReason = 'Connection refused by server';
    } else if (/HTTP 404/i.test(rawError)) {
      detailedReason = 'Page returned HTTP 404 Not Found';
    } else if (/HTTP (?:4\d\d|5\d\d)/i.test(rawError)) {
      detailedReason = `Server responded with ${rawError}`;
    }

    return {
      valid: false,
      status: 'INVALID',
      message: STATUS_MESSAGES.INVALID,
      reason: detailedReason,
      score: 0,
      signals: [],
      extracted: { title: '', text: '', links: [], metaDescription: '', hostname: '' }
    };
  }

  const html = fetchResult.html || '';
  const finalUrl = fetchResult.finalUrl || targetUrl;
  const extracted = extractFromHtml(html, finalUrl);

  const title = (extracted.title || '').trim();
  const text = (extracted.text || '').trim();
  const metaDescription = (extracted.metaDescription || '').trim();
  const combinedMeta = `${title} ${metaDescription} ${text.slice(0, 3000)}`;

  // 2. Check for bot challenge / access block
  for (const pattern of BOT_CHALLENGE_PATTERNS) {
    if (pattern.test(title) || (pattern.test(combinedMeta) && text.length < 500)) {
      return {
        valid: false,
        status: 'INVALID',
        message: STATUS_MESSAGES.INVALID,
        reason: 'Automated challenge or access restriction screen',
        score: 0,
        signals: [],
        extracted
      };
    }
  }

  // 3. Check for parked domain
  for (const pattern of PARKED_DOMAIN_PATTERNS) {
    if (pattern.test(combinedMeta)) {
      return {
        valid: false,
        status: 'INVALID',
        message: STATUS_MESSAGES.INVALID,
        reason: 'Domain appears to be parked, expired, or listed for sale',
        score: 0,
        signals: [],
        extracted
      };
    }
  }

  // 4. Check for default server hosting page
  for (const pattern of DEFAULT_SERVER_PATTERNS) {
    if (pattern.test(combinedMeta)) {
      return {
        valid: false,
        status: 'INVALID',
        message: STATUS_MESSAGES.INVALID,
        reason: 'Generic web server default installation or maintenance placeholder',
        score: 0,
        signals: [],
        extracted
      };
    }
  }

  // 5. Check for empty or minimal text (< 80 chars)
  if (text.length < 80 && extracted.links.length < 3) {
    return {
      valid: false,
      status: 'INVALID',
      message: STATUS_MESSAGES.INVALID,
      reason: 'Webpage contains insufficient or empty readable text',
      score: 0,
      signals: [],
      extracted
    };
  }

  // 6. Check for obvious mock / placeholder domain
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(combinedMeta)) {
      return {
        valid: false,
        status: 'INVALID',
        message: STATUS_MESSAGES.INVALID,
        reason: 'Page contains placeholder or mock demonstration content',
        score: 0,
        signals: [],
        extracted
      };
    }
  }

  // 7. Extract genuine organization / company signals
  const signals = [];

  const linksAndText = [
    ...extracted.links.map((l) => (l.text || '') + ' ' + (l.url || '')),
    title,
    text.slice(0, 2000)
  ].join(' ');

  const hasAbout = /\b(?:about|about[- ]us|who[- ]we[- ]are|our[- ]story|company|overview)\b/i.test(linksAndText);
  if (hasAbout) signals.push('About / Company Information');

  const hasProducts = /\b(?:products|services|solutions|features|platform|offerings|technology)\b/i.test(linksAndText);
  if (hasProducts) signals.push('Products / Services / Solutions');

  const hasContact = /\b(?:contact|contact[- ]us|get[- ]in[- ]touch|support|sales)\b/i.test(linksAndText);
  if (hasContact) signals.push('Contact / Support Channels');

  const hasCareers = /\b(?:careers|jobs|join[- ]us|work[- ]with[- ]us|hiring|open[- ]roles)\b/i.test(linksAndText);
  if (hasCareers) signals.push('Careers / Open Positions');

  const hasTeam = /\b(?:team|leadership|founders|board|executives)\b/i.test(linksAndText);
  if (hasTeam) signals.push('Team / Leadership Information');

  const hasCommercial = /\b(?:pricing|plans|customers|case[- ]studies|clients)\b/i.test(linksAndText);
  if (hasCommercial) signals.push('Commercial / Pricing / Clients');

  // Corporate identity / Copyright entity
  const hasCorporateEntity = /(?:©|copyright|\(c\))\s*(?:20\d\d|19\d\d)?\s*[^.\n]{2,60}\b(?:inc|llc|ltd|corp|corporation|gmbh|technologies|technology|pvt|group|solutions|holdings|company|software|systems|labs|enterprises)\b/i.test(html) ||
    /\b(?:incorporated|corporation|proprietary|all rights reserved)\b/i.test(html);
  if (hasCorporateEntity) signals.push('Corporate Entity / Registered Business Identifiers');

  // Legal / Policy Links
  const hasLegal = /\b(?:privacy[- ]policy|terms[- ]of[- ]service|terms[- ]and[- ]conditions|legal)\b/i.test(linksAndText);
  if (hasLegal) signals.push('Legal & Privacy Policies');

  // Meta Business Description
  if (metaDescription.length >= 35) {
    signals.push('Detailed Meta Business Description');
  }

  // Substantive visible text volume
  if (text.length >= 600) {
    signals.push('Substantive Organizational Content');
  }

  const score = signals.length;

  // 8. Determine Status based on signals and depth
  if (score >= 3 && text.length >= 250) {
    return {
      valid: true,
      status: 'VALID',
      message: STATUS_MESSAGES.VALID,
      reason: 'Website exhibits multiple clear organizational and business signals',
      score,
      signals,
      extracted
    };
  }

  // Reachable, readable page, but lacks sufficient organization signals to confirm company identity
  return {
    valid: true,
    status: 'UNCERTAIN',
    message: STATUS_MESSAGES.UNCERTAIN,
    reason: 'Website is reachable but provides limited or ambiguous organizational indicators',
    score,
    signals,
    extracted
  };
}

module.exports = {
  STATUS_MESSAGES,
  classifyWebsite
};
