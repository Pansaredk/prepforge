/**
 * Kit Validation Service
 * Enforces structural invariants before kit persistence
 */

/**
 * Validates complete generated kit data
 * @param {object} kitData
 * @param {number} requestedDays
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateKit(kitData, requestedDays) {
  const errors = [];

  // 1. Validate requirements
  if (!Array.isArray(kitData.requirements) || kitData.requirements.length === 0) {
    errors.push('Kit must contain at least one requirement');
  } else {
    const reqIds = new Set();
    for (const r of kitData.requirements) {
      if (!r.id || typeof r.id !== 'string') {
        errors.push(`Invalid requirement ID: ${JSON.stringify(r)}`);
      } else if (reqIds.has(r.id)) {
        errors.push(`Duplicate requirement ID: ${r.id}`);
      } else {
        reqIds.add(r.id);
      }

      if (!r.text || typeof r.text !== 'string' || !r.text.trim()) {
        errors.push(`Requirement ${r.id} is missing text`);
      }
    }
  }

  const validReqIds = new Set((kitData.requirements || []).map((r) => r.id));

  // 2. Validate question bank
  if (!Array.isArray(kitData.questionBank) || kitData.questionBank.length === 0) {
    errors.push('Kit must contain at least one interview question');
  } else {
    const qIds = new Set();
    const qTexts = new Set();

    for (const q of kitData.questionBank) {
      if (!q.id || typeof q.id !== 'string') {
        errors.push('Question is missing an ID');
      } else if (qIds.has(q.id)) {
        errors.push(`Duplicate question ID: ${q.id}`);
      } else {
        qIds.add(q.id);
      }

      if (!q.question || typeof q.question !== 'string' || !q.question.trim()) {
        errors.push(`Question ${q.id} is missing question text`);
      } else {
        const lower = q.question.toLowerCase().trim();
        if (qTexts.has(lower)) {
          errors.push(`Duplicate question content detected: ${q.id}`);
        }
        qTexts.add(lower);
      }

      if (!q.category || typeof q.category !== 'string') {
        errors.push(`Question ${q.id} is missing a category`);
      }

      if (!Array.isArray(q.answerOutline) || q.answerOutline.length === 0) {
        errors.push(`Question ${q.id} must have an answer outline`);
      }

      if (!Number.isInteger(q.durationMinutes) || q.durationMinutes <= 0) {
        errors.push(`Question ${q.id} durationMinutes must be a positive integer (got ${q.durationMinutes})`);
      }

      if (!Array.isArray(q.requirementIds) || q.requirementIds.length === 0) {
        errors.push(`Question ${q.id} must map to at least one requirement ID`);
      } else {
        for (const rId of q.requirementIds) {
          if (!validReqIds.has(rId)) {
            errors.push(`Question ${q.id} references non-existent requirement: ${rId}`);
          }
        }
      }
    }
  }

  const validQIds = new Set((kitData.questionBank || []).map((q) => q.id));

  // 3. Validate flashcards
  if (Array.isArray(kitData.flashcards)) {
    for (const fc of kitData.flashcards) {
      if (!fc.id) {
        errors.push('Flashcard missing ID');
      }
      if (!fc.questionId || !validQIds.has(fc.questionId)) {
        errors.push(`Flashcard ${fc.id} references non-existent question: ${fc.questionId}`);
      }
      if (!fc.front || !fc.back) {
        errors.push(`Flashcard ${fc.id} missing front or back text`);
      }
    }
  }

  // 4. Validate schedule
  if (!kitData.schedule || !Array.isArray(kitData.schedule.days)) {
    errors.push('Kit must contain a valid schedule object with days array');
  } else {
    const days = kitData.schedule.days;
    if (days.length !== requestedDays) {
      errors.push(`Schedule length (${days.length}) does not match requested days (${requestedDays})`);
    }

    const seenDays = new Set();
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      if (d.day !== i + 1) {
        errors.push(`Schedule day mismatch: expected ${i + 1}, got ${d.day}`);
      }
      seenDays.add(d.day);

      if (!Number.isInteger(d.minutes) || d.minutes < 0) {
        errors.push(`Schedule day ${d.day} minutes must be a non-negative integer`);
      }

      if (Array.isArray(d.questionIds)) {
        for (const qId of d.questionIds) {
          if (!validQIds.has(qId)) {
            errors.push(`Schedule day ${d.day} references unknown question ID: ${qId}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateKit
};
