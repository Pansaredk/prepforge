const { callLlm, generateHeuristicResponse, safeParseJson } = require('./llmService');

/**
 * Generates Company Brief and Role Breakdown
 */
async function generateBriefs(jobDescription, title, companyUrl, researchText = '') {
  const prompt = `
You are an executive interview coach. Based on the following Job Description and Company Research, generate a Company Brief and a Role Breakdown.

JOB TITLE: ${title}
COMPANY URL: ${companyUrl}

COMPANY RESEARCH TEXT:
"""
${researchText.substring(0, 3000)}
"""

JOB DESCRIPTION:
"""
${jobDescription.substring(0, 3000)}
"""

Return ONLY a JSON object with this exact structure:
{
  "companyBrief": {
    "overview": "Concise 2-3 sentence overview of the company",
    "products": ["Product/Service 1", "Product/Service 2"],
    "industry": "Industry and Domain",
    "culture": ["Culture point 1", "Culture point 2"],
    "interviewContext": "Key context for candidates entering this interview"
  },
  "roleBreakdown": {
    "summary": "Concise summary of the role expectations",
    "responsibilities": ["Responsibility 1", "Responsibility 2"],
    "requiredSkills": ["Skill 1", "Skill 2"],
    "niceToHaveSkills": ["Skill A", "Skill B"],
    "interviewFocusAreas": ["Focus 1", "Focus 2"]
  }
}
If company research is minimal, ground the company brief honestly on the provided job description.
`.trim();

  const raw = await callLlm(prompt, { json: true });
  if (raw) {
    const parsed = safeParseJson(raw);
    if (parsed && parsed.companyBrief && parsed.roleBreakdown) {
      return {
        companyBrief: {
          overview: parsed.companyBrief.overview || '',
          products: Array.isArray(parsed.companyBrief.products) ? parsed.companyBrief.products : [],
          industry: parsed.companyBrief.industry || '',
          culture: Array.isArray(parsed.companyBrief.culture) ? parsed.companyBrief.culture : [],
          interviewContext: parsed.companyBrief.interviewContext || ''
        },
        roleBreakdown: {
          summary: parsed.roleBreakdown.summary || '',
          responsibilities: Array.isArray(parsed.roleBreakdown.responsibilities) ? parsed.roleBreakdown.responsibilities : [],
          requiredSkills: Array.isArray(parsed.roleBreakdown.requiredSkills) ? parsed.roleBreakdown.requiredSkills : [],
          niceToHaveSkills: Array.isArray(parsed.roleBreakdown.niceToHaveSkills) ? parsed.roleBreakdown.niceToHaveSkills : [],
          interviewFocusAreas: Array.isArray(parsed.roleBreakdown.interviewFocusAreas) ? parsed.roleBreakdown.interviewFocusAreas : []
        }
      };
    }
  }

  // Heuristic Fallback
  const companyBrief = generateHeuristicResponse('companyBrief', { jobDescription, title, researchText });
  const roleBreakdown = generateHeuristicResponse('roleBreakdown', { jobDescription, title, researchText });

  return {
    companyBrief,
    roleBreakdown
  };
}

module.exports = {
  generateBriefs
};
