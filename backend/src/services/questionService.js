const { callLlm, generateHeuristicResponse, safeParseJson } = require('./llmService');
const { deduplicateQuestions } = require('./questionCatalog');

const VALID_CATEGORIES = new Set([
  'Technical',
  'Behavioral',
  'Role-specific',
  'Company-specific'
]);

/**
 * Validates and sanitizes a list of generated questions against known requirement IDs
 */
function sanitizeQuestions(questions, validReqIds, startIndex = 1) {
  if (!Array.isArray(questions)) return [];

  // Deduplicate before processing to eliminate exact or semantic near-duplicates
  const deduplicated = deduplicateQuestions(questions);

  const reqSet = new Set(validReqIds);
  const sanitized = [];
  const seenIds = new Set();
  const seenTexts = new Set();

  for (let i = 0; i < deduplicated.length; i++) {
    const q = deduplicated[i];
    if (!q || typeof q.question !== 'string' || !q.question.trim()) continue;

    const trimmedQuestion = q.question.trim();
    const lowerText = trimmedQuestion.toLowerCase();
    if (seenTexts.has(lowerText)) continue;
    seenTexts.add(lowerText);

    let id = (q.id && typeof q.id === 'string' && q.id.startsWith('q-'))
      ? q.id
      : `q-${String(startIndex + sanitized.length).padStart(3, '0')}`;

    if (seenIds.has(id)) {
      id = `q-${String(startIndex + sanitized.length).padStart(3, '0')}`;
    }
    seenIds.add(id);

    // Filter requirementIds to only valid ones
    const rawReqIds = Array.isArray(q.requirementIds) ? q.requirementIds : [];
    const filteredReqIds = rawReqIds.filter((rId) => reqSet.has(rId));

    // If no valid requirement ID matched, assign the first available requirement ID
    if (filteredReqIds.length === 0 && validReqIds.length > 0) {
      filteredReqIds.push(validReqIds[sanitized.length % validReqIds.length]);
    }

    // Category
    const category = VALID_CATEGORIES.has(q.category) ? q.category : 'Technical';

    // Duration: must be integer
    let duration = parseInt(q.durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      duration = 5;
    }

    // Answer Outline: array of strings
    let answerOutline = [];
    if (Array.isArray(q.answerOutline)) {
      answerOutline = q.answerOutline.map((item) => String(item).trim()).filter(Boolean);
    }
    if (answerOutline.length === 0) {
      answerOutline = [
        'Define key concepts and background',
        'Walk through implementation or STAR scenario',
        'State outcomes, trade-offs, and best practices'
      ];
    }

    sanitized.push({
      id,
      category,
      question: trimmedQuestion,
      answerOutline,
      requirementIds: filteredReqIds,
      durationMinutes: duration,
      source: 'generated',
      edited: false,
      pinned: false
    });
  }

  return sanitized;
}

/**
 * Generates an initial question bank from requirements and JD
 */
async function generateQuestionBank(jobDescription, title, requirements, companyUrl) {
  const validReqIds = requirements.map((r) => r.id);

  const targetMin = Math.max(15, Math.min(30, requirements.length * 2 + 4));
  const targetMax = Math.max(20, Math.min(40, requirements.length * 3 + 6));

  const prompt = `
You are a senior technical hiring manager and interview panel lead designing a comprehensive interview question bank for the role "${title}".

REQUIREMENTS TO COVER:
${JSON.stringify(requirements, null, 2)}

JOB DESCRIPTION:
"""
${jobDescription.substring(0, 3000)}
"""

GOAL:
Generate a realistic, comprehensive interview question bank containing between ${targetMin} and ${targetMax} high-quality questions grounded directly in the requirements above (target 20-35 questions for a full technical JD).

QUESTION DISTRIBUTION & ANGLES:
1. For each technical requirement, provide 2 to 4 questions exploring different angles:
   - Fundamental concepts and core language/framework behaviors
   - Practical implementation, error handling, and coding scenarios
   - Production architecture, scalability, and design trade-offs
   - Debugging, troubleshooting, and edge cases
2. Include 2 to 4 Behavioral questions (evaluating teamwork, conflict resolution, technical ownership using STAR format).
3. Include 2 to 4 Role-specific or System Integration questions (end-to-end full-stack workflow, state synchronization, production deployment).

RULES:
1. Return ONLY a JSON object with this exact structure:
{
  "questions": [
    {
      "id": "q-001",
      "category": "Technical", // Must be one of: Technical, Behavioral, Role-specific, Company-specific
      "question": "Clear, realistic interview question...",
      "answerOutline": [
        "Core concept or context",
        "Concrete implementation or STAR response",
        "Key trade-offs or production takeaways"
      ],
      "requirementIds": ["req-001"], // MUST reference existing requirement IDs from the list above
      "durationMinutes": 5 // MUST be an integer between 3 and 15
    }
  ]
}
2. Ensure EVERY requirement ID from the list is covered by at least one question.
3. Do NOT generate duplicate or nearly identical questions.
4. Keep durationMinutes strictly as integers between 3 and 15.
`.trim();

  const raw = await callLlm(prompt, { json: true });
  if (raw) {
    const parsed = safeParseJson(raw);
    if (parsed && Array.isArray(parsed.questions)) {
      const sanitized = sanitizeQuestions(parsed.questions, validReqIds, 1);
      if (sanitized.length > 0) {
        return sanitized;
      }
    }
  }

  // Heuristic Fallback
  const fallback = generateHeuristicResponse('questions', { jobDescription, title, requirements });
  return sanitizeQuestions(fallback.questions, validReqIds, 1);
}

/**
 * Generates targeted questions for uncovered requirements (Pass 2)
 */
async function generateTargetedQuestions(uncoveredRequirements, existingQuestionCount, allValidReqIds) {
  const prompt = `
Generate targeted interview questions specifically covering these UNCOVERED requirements:
${JSON.stringify(uncoveredRequirements, null, 2)}

Return ONLY a JSON object:
{
  "questions": [
    {
      "id": "q-${String(existingQuestionCount + 1).padStart(3, '0')}",
      "category": "Technical",
      "question": "Question text...",
      "answerOutline": ["Point 1", "Point 2"],
      "requirementIds": ["req-XXX"],
      "durationMinutes": 5
    }
  ]
}
Each question must target at least one uncovered requirement ID. durationMinutes must be an integer.
`.trim();

  const raw = await callLlm(prompt, { json: true });
  if (raw) {
    const parsed = safeParseJson(raw);
    if (parsed && Array.isArray(parsed.questions)) {
      const sanitized = sanitizeQuestions(parsed.questions, allValidReqIds, existingQuestionCount + 1);
      if (sanitized.length > 0) {
        return sanitized;
      }
    }
  }

  const fallback = generateHeuristicResponse('missingQuestions', {
    uncoveredRequirements,
    existingQuestionCount
  });
  return sanitizeQuestions(fallback.questions, allValidReqIds, existingQuestionCount + 1);
}

module.exports = {
  generateQuestionBank,
  generateTargetedQuestions,
  sanitizeQuestions
};
