const { safeParseJson } = require('../utils/jsonParser');

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
    'Kubernetes', 'AWS', 'GCP', 'Azure', 'REST', 'GraphQL', 'CI/CD', 'Git',
    'Microservices', 'System Design', 'Testing', 'Agile', 'Scrum', 'Linux'
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

    for (let i = 0; i < Math.min(detectedTech.length, 6); i++) {
      const isMust = i < 4; // First 3-4 are must-haves
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
    const questions = [];
    let qCount = 1;

    const categories = ['Technical', 'Technical', 'Role-specific', 'Behavioral', 'Company-specific'];

    requirements.forEach((req, idx) => {
      const category = categories[idx % categories.length];
      const qId = `q-${String(qCount).padStart(3, '0')}`;

      let questionText = '';
      let answerOutline = [];
      let duration = 5;

      if (category === 'Behavioral') {
        questionText = `Describe a challenging situation where you had to demonstrate ${req.text}. How did you navigate it and what was the outcome?`;
        answerOutline = [
          'Context: Set the project background and the challenge faced',
          'Action: Specific steps taken to address the situation using STAR method',
          'Result: Measurable impact and lessons learned'
        ];
        duration = 7;
      } else if (category === 'Role-specific') {
        questionText = `How would you approach designing a feature that heavily relies on ${req.text}? What architectural trade-offs would you consider?`;
        answerOutline = [
          'Requirement analysis and constraint identification',
          'Component breakdown and data flow diagram',
          'Trade-off discussion between simplicity, performance, and scalability'
        ];
        duration = 8;
      } else if (category === 'Company-specific') {
        questionText = `How does your experience with ${req.text} prepare you to contribute to our engineering goals and product scale?`;
        answerOutline = [
          'Highlight past direct hands-on experience',
          'Connect technical skill to high-availability user experience',
          'Explain eagerness to adopt team engineering standards'
        ];
        duration = 5;
      } else {
        questionText = `Explain the core concepts, common pitfalls, and best practices when working with ${req.text}.`;
        answerOutline = [
          'Core fundamentals and mental model',
          'Common performance or concurrency pitfalls and mitigations',
          'Production-grade implementation standards'
        ];
        duration = 6;
      }

      questions.push({
        id: qId,
        category,
        question: questionText,
        answerOutline,
        requirementIds: [req.id],
        durationMinutes: duration,
        source: 'generated',
        edited: false,
        pinned: false
      });

      qCount++;
    });

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
        question: `Deep dive: Demonstrate your practical experience with ${req.text} through a real-world scenario.`,
        answerOutline: [
          'Demonstrate theoretical and practical understanding',
          'Explain specific tools, libraries, or patterns used',
          'Discuss optimization and error-handling strategies'
        ],
        requirementIds: [req.id],
        durationMinutes: 6,
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
