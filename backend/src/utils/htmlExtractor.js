/**
 * Lightweight HTML extractor for webpage text and links without external dependencies
 */

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

  // 2. Discover links
  const links = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"'#\s]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const linkText = match[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');

    try {
      const resolved = new URL(rawHref, baseUrl);
      // Only keep same-origin or relevant http/https links
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        // Exclude common static asset extensions
        if (!/\.(png|jpe?g|gif|svg|pdf|css|js|ico|woff2?|zip|exe)$/i.test(resolved.pathname)) {
          links.push({
            url: resolved.href,
            text: linkText
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
    text: cleaned,
    links
  };
}

module.exports = {
  extractFromHtml
};
