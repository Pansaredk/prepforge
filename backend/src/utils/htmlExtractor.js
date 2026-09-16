/**
 * Lightweight HTML extractor for webpage text and links without external dependencies
 */

/**
 * Normalizes a URL by stripping fragments, tracking queries, and trailing slashes
 * @param {string} urlString
 * @returns {string}
 */
function normalizeUrl(urlString) {
  try {
    const u = new URL(urlString);
    u.hash = '';
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source', 'fbclid', 'gclid'];
    for (const p of trackingParams) {
      u.searchParams.delete(p);
    }
    let href = u.href;
    if (u.pathname !== '/' && href.endsWith('/')) {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return urlString || '';
  }
}

/**
 * Extracts page title, clean text, and discovered links from HTML string
 * @param {string} html
 * @param {string} baseUrl
 * @returns {{ title: string, text: string, links: Array<{ url: string, text: string }> }}
 */
function extractFromHtml(html, baseUrl) {
  if (!html || typeof html !== 'string') {
    return { title: '', text: '', links: [] };
  }

  // 1. Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

  // 1b. Extract meta description
  const metaDescMatch = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                        html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i) ||
                        html.match(/<meta\s+[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim().replace(/\s+/g, ' ') : '';

  let hostname = '';
  try {
    hostname = new URL(baseUrl).hostname;
  } catch {
    hostname = '';
  }

  // 2. Discover links
  const links = [];
  const linkRegex = /<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const attrs = match[1];
    const innerHtml = match[2];

    // Extract href
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    const rawHref = hrefMatch[1].trim();
    if (/^(?:javascript:|mailto:|tel:|#)/i.test(rawHref)) continue;

    // Extract link text, aria-label, and title
    const innerText = innerHtml.replace(/<[^>]+>/g, ' ').trim();
    const ariaMatch = attrs.match(/aria-label=["']([^"']+)["']/i);
    const titleAttrMatch = attrs.match(/title=["']([^"']+)["']/i);

    const fullText = [
      innerText,
      ariaMatch ? ariaMatch[1] : '',
      titleAttrMatch ? titleAttrMatch[1] : ''
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    try {
      const resolved = new URL(rawHref, baseUrl);
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        if (!/\.(png|jpe?g|gif|svg|pdf|css|js|ico|woff2?|zip|exe|mp4|webm)$/i.test(resolved.pathname)) {
          const normalized = normalizeUrl(resolved.href);
          links.push({
            url: normalized,
            text: fullText
          });
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  // 3. Clean and extract readable text
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<[^>]+>/g, ' ') // strip all HTML tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Cap readable text to 6,000 characters to prevent excessive token consumption
  if (cleaned.length > 6000) {
    cleaned = cleaned.substring(0, 6000) + '...';
  }

  return {
    title,
    metaDescription,
    hostname,
    text: cleaned,
    links
  };
}

module.exports = {
  extractFromHtml,
  normalizeUrl
};
