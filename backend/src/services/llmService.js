const { safeParseJson } = require('../utils/jsonParser');
const { buildComprehensiveQuestionBank } = require('./questionCatalog');

const DEFAULT_MODEL = process.env.LLM_MODEL || 'gemini-1.5-flash';

/**
 * Calls LLM API with prompt and returns generated text or parsed JSON.
 * @param {string} prompt
 * @param {{ timeoutMs?: number, json?: boolean }} options
 * @returns {Promise<string | null>}
 */
async function callLlm(prompt, options = {}) {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || 15000;

  if (!apiKey) {
    return null; // Signals caller to use fallback generator
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          ...(options.json && { responseMimeType: 'application/json' })
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[LLM] API returned HTTP ${response.status}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText || null;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn(`[LLM] Request failed: ${error.message}`);
    return null;
  }
}

/**
 * Intelligent deterministic fallback generator for when LLM is unavailable or unconfigured
 */
function generateHeuristicResponse(type, context = {}) {
  const jd = (context.jobDescription || '').trim();
  const title = (context.title || 'Software Engineer').trim();
  const researchText = (context.researchText || '').trim();

  // Extract key technical and role signals from JD
  const words = jd.split(/\s+/);
  const detectedTech = [];
  const knownKeywords = [
    'React', 'Next.js', 'Node.js', 'Express', 'JavaScript', 'TypeScript', 'Python',
    'Java', 'C++', 'Go', 'Rust', 'MongoDB', 'PostgreSQL', 'SQL', 'Redis', 'Docker',
    'Kubernetes', 'AWS', 'GCP', 'Azure', 'REST', 'GraphQL', 'CI/CD', 'Git', 'GitHub',
    'HTML', 'CSS', 'Redux', 'Tailwind', 'Microservices', 'System Design', 'Testing', 'Agile', 'Scrum', 'Linux'
  ];

  for (const kw of knownKeywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i').test(jd)) {
      detectedTech.push(kw);
    }
  }

  // Fallback if very thin JD
  if (detectedTech.length === 0) {
    detectedTech.push('Core Software Development', 'Problem Solving', 'System Design', 'Communication');
  }

  if (type === 'requirements') {
    const reqs = [];
    let count = 1;

    // Scale requirements with detected skills: 4 to 8 technical requirements
    const maxTechReqs = Math.min(detectedTech.length, 8);
    for (let i = 0; i < maxTechReqs; i++) {
      const isMust = i < Math.min(4, Math.ceil(maxTechReqs * 0.6));
      reqs.push({
        id: `req-${String(count).padStart(3, '0')}`,
        text: `Proficiency in ${detectedTech[i]} and associated engineering best practices`,
        must: isMust,
        nice: !isMust
      });
      count++;
    }

    // Add behavioral / communication requirement
    reqs.push({
      id: `req-${String(count).padStart(3, '0')}`,
      text: 'Cross-functional collaboration and clear technical communication',
      must: true,
      nice: false
    });

    return { requirements: reqs };
  }

  if (type === 'companyBrief') {
    const overview = researchText.length > 50
      ? `Based on company research, this organization operates in technology solutions with emphasis on modern software delivery and user-focused products.`
      : `Based on available information for ${title}, this organization emphasizes high-quality software engineering, continuous learning, and scalable architecture.`;

    return {
      overview,
      products: ['Web and Mobile Applications', 'Cloud Architecture and Services', 'Internal Developer Tooling'],
      industry: 'Software & Technology Services',
      culture: ['Collaborative engineering environment', 'Fast-paced agile delivery', 'Emphasis on technical excellence'],
      interviewContext: 'Interviews evaluate both technical proficiency against core requirements and behavioral alignment with teamwork values.'
    };
  }

  if (type === 'roleBreakdown') {
    return {
      summary: `Role focused on ${title}, contributing to application architecture, development, and team collaboration.`,
      responsibilities: [
        'Design and implement reliable, scalable software solutions',
        'Participate in code reviews and architectural discussions',
        'Collaborate with product and design peers on feature requirements',
        'Maintain system reliability and high test coverage'
      ],
      requiredSkills: detectedTech.slice(0, 4),
      niceToHaveSkills: detectedTech.slice(4, 7).length > 0 ? detectedTech.slice(4, 7) : ['Cloud Infrastructure', 'CI/CD Pipelines'],
      interviewFocusAreas: ['Core Technology Proficiency', 'System Design & Problem Solving', 'Behavioral & Culture Fit']
    };
  }

  if (type === 'questions') {
    const requirements = context.requirements || [];
    const roleTitle = context.title || title || 'Software Engineer';
    const questions = buildComprehensiveQuestionBank(requirements, roleTitle);
    return { questions };
  }

  if (type === 'missingQuestions') {
    const uncovered = context.uncoveredRequirements || [];
    const startIndex = context.existingQuestionCount || 1;
    const questions = [];

    uncovered.forEach((req, idx) => {
      const qId = `q-${String(startIndex + idx + 1).padStart(3, '0')}`;
      questions.push({
        id: qId,
        category: 'Technical',
        question: `Deep Dive: Walk through a production implementation scenario and design trade-offs when applying ${req.text}.`,
        answerOutline: [
          'Core theoretical fundamentals and engineering constraints',
          'Concrete implementation details and error mitigation strategies',
          'Production monitoring, scalability, and test validation approach'
        ],
        requirementIds: [req.id],
        durationMinutes: 7,
        source: 'generated',
        edited: false,
        pinned: false
      });
    });

    return { questions };
  }

  return null;
}

module.exports = {
  callLlm,
  generateHeuristicResponse,
  safeParseJson
};
