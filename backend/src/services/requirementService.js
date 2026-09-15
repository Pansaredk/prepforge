const { callLlm, generateHeuristicResponse, safeParseJson } = require('./llmService');

/**
 * Validates requirements list structure and ensures stable IDs
 */
function validateRequirements(reqList) {
  if (!Array.isArray(reqList) || reqList.length === 0) {
    return null;
  }

  const validReqs = [];
  const seenIds = new Set();

  for (let i = 0; i < reqList.length; i++) {
    const r = reqList[i];
    if (!r || typeof r.text !== 'string' || !r.text.trim()) {
      continue;
    }

    const id = (r.id && typeof r.id === 'string' && r.id.startsWith('req-'))
      ? r.id
      : `req-${String(i + 1).padStart(3, '0')}`;

    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    validReqs.push({
      id,
      text: r.text.trim(),
      must: Boolean(r.must),
      nice: Boolean(r.nice)
    });
  }

  return validReqs.length > 0 ? validReqs : null;
}

/**
 * Extracts structured requirements from a Job Description.
 * @param {string} jobDescription
 * @param {string} title
 * @returns {Promise<Array<{ id: string, text: string, must: boolean, nice: boolean }>>}
 */
async function extractRequirements(jobDescription, title = '') {
  const prompt = `
You are an expert technical recruiter analyzing a Job Description for the role "${title}".
Extract core technical, behavioral, and domain requirements from the following text:

JOB DESCRIPTION:
"""
${jobDescription.substring(0, 4000)}
"""

REQUIREMENTS:
1. Return ONLY a valid JSON object matching this exact schema:
{
  "requirements": [
    {
      "id": "req-001",
      "text": "Specific requirement description grounded in the JD",
      "must": true,
      "nice": false
    }
  ]
}
2. Distinguish must-have requirements (core technologies, minimum years, primary responsibilities) from nice-to-have requirements (bonus skills, preferred qualifications).
3. Do not invent requirements not mentioned or implied by the JD.
4. Keep the list concise and focused (between 4 and 8 requirements).
5. Ensure stable IDs starting with "req-001", "req-002", etc.
`.trim();

  const raw = await callLlm(prompt, { json: true });
  if (raw) {
    const parsed = safeParseJson(raw);
    if (parsed && parsed.requirements) {
      const validated = validateRequirements(parsed.requirements);
      if (validated) {
        return validated;
      }
    }
  }

  // Fallback to grounded heuristic extraction
  const fallback = generateHeuristicResponse('requirements', { jobDescription, title });
  return validateRequirements(fallback.requirements) || [];
}

module.exports = {
  extractRequirements,
  validateRequirements
};
