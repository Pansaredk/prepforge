/**
 * URL Validator with SSRF Protection
 */

const PRIVATE_IPV4_PATTERNS = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./,
  /^0\./
];

const FORBIDDEN_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
  '0.0.0.0',
  'metadata.google.internal',
  '169.254.169.254'
]);

/**
 * Validates a company URL and guards against SSRF attacks.
 * @param {string} urlString
 * @returns {{ valid: boolean, error?: string, normalizedUrl?: string }}
 */
function validateCompanyUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }

  const trimmed = urlString.trim();

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Enforce http/https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http and https protocols are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost, loopback, and metadata hostnames
  if (FORBIDDEN_HOSTNAMES.has(hostname)) {
    return { valid: false, error: 'Access to loopback or metadata addresses is prohibited' };
  }

  // Block single-label hostnames (e.g., http://internal-db/)
  if (!hostname.includes('.') && hostname !== 'localhost') {
    return { valid: false, error: 'Invalid or internal hostname' };
  }

  // Block private IPv4 ranges
  for (const pattern of PRIVATE_IPV4_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'Access to private network IP addresses is prohibited' };
    }
  }

  // Block IPv6 private ranges (fc00::/7, fe80::/10)
  if (hostname.startsWith('[fc') || hostname.startsWith('[fd') || hostname.startsWith('[fe8') || hostname.startsWith('[fe9')) {
    return { valid: false, error: 'Access to private IPv6 addresses is prohibited' };
  }

  return { valid: true, normalizedUrl: parsed.href };
}

module.exports = {
  validateCompanyUrl
};
