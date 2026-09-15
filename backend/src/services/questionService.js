const { callLlm, generateHeuristicResponse, safeParseJson } = require('./llmService');

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

  const reqSet = new Set(validReqIds);
  const sanitized = [];
  const seenIds = new Set();
  const seenTexts = new Set();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
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

  const prompt = `
You are a senior technical hiring manager designing an interview question bank for the role "${title}".
REQUIREMENTS TO COVER:
${JSON.stringify(requirements, null, 2)}

JOB DESCRIPTION:
"""
${jobDescription.substring(0, 3000)}
"""

Generate between 6 and 12 high-impact interview questions.
RULES:
1. Return ONLY a JSON object:
{
  "questions": [
    {
      "id": "q-001",
      "category": "Technical", // Must be one of: Technical, Behavioral, Role-specific, Company-specific
      "question": "Question text...",
      "answerOutline": ["Point 1", "Point 2", "Point 3"],
      "requirementIds": ["req-001"], // MUST reference existing requirement IDs from the list above
      "durationMinutes": 5 // MUST be an integer between 3 and 15
    }
  ]
}
2. Ensure EVERY requirement ID from the list is covered by at least one question.
3. Keep durationMinutes strictly as integers.
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
