/**
 * Safe LLM JSON parser utility
 */

/**
 * Extracts and parses a JSON object or array from an LLM response string.
 * Gracefully handles markdown fences, leading/trailing prose, and minor formatting errors.
 * @param {string} rawResponse
 * @returns {any | null}
 */
function safeParseJson(rawResponse) {
  if (!rawResponse || typeof rawResponse !== 'string') {
    return null;
  }

  let text = rawResponse.trim();

  // 1. Check for markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  }

  // 2. Direct parse attempt
  try {
    return JSON.parse(text);
  } catch {
    // Continue to repair attempts
  }

  // 3. Find first '{' or '[' and last '}' or ']'
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endIndex = text.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endIndex = text.lastIndexOf(']');
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const candidate = text.substring(startIndex, endIndex + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // 4. Try removing trailing commas
      try {
        const cleaned = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
      } catch {
        // Fall through
      }
    }
  }

  return null;
}

module.exports = {
  safeParseJson
};
