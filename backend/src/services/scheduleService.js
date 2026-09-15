/**
 * Deterministic Study Schedule Service
 * Calculates structured interview preparation schedule purely in JavaScript (NO LLM)
 */

/**
 * Creates a deterministic study schedule across requested days.
 * @param {number} totalDays Integer between 1 and 60
 * @param {Array<{ id: string, category: string, durationMinutes: number, requirementIds: string[] }>} questionBank
 * @param {Array<{ id: string, must: boolean }>} requirements
 * @returns {{ days: Array<{ day: number, focus: string, questionIds: string[], minutes: number }> }}
 */
function generateSchedule(totalDays, questionBank = [], requirements = []) {
  const daysCount = Math.max(1, Math.min(60, parseInt(totalDays, 10) || 5));

  const questionMap = new Map();
  questionBank.forEach((q) => questionMap.set(q.id, q));

  const mustReqIds = new Set(requirements.filter((r) => r.must).map((r) => r.id));

  // Partition questions into must-have and other questions
  const mustQuestions = [];
  const otherQuestions = [];

  questionBank.forEach((q) => {
    const coversMust = (q.requirementIds || []).some((rId) => mustReqIds.has(rId));
    if (coversMust) {
      mustQuestions.push(q);
    } else {
      otherQuestions.push(q);
    }
  });

  // Prioritize Technical & Role-specific first, then Behavioral & Company-specific
  const categoryOrder = { 'Technical': 1, 'Role-specific': 2, 'Behavioral': 3, 'Company-specific': 4 };
  mustQuestions.sort((a, b) => (categoryOrder[a.category] || 5) - (categoryOrder[b.category] || 5));
  otherQuestions.sort((a, b) => (categoryOrder[a.category] || 5) - (categoryOrder[b.category] || 5));

  const prioritized = [...mustQuestions, ...otherQuestions];

  // Initialize schedule array of exact requested length
  const scheduleDays = [];
  for (let d = 1; d <= daysCount; d++) {
    scheduleDays.push({
      day: d,
      focus: '',
      questionIds: [],
      minutes: 0
    });
  }

  // Handle 1-day crash course
  if (daysCount === 1) {
    const allIds = questionBank.map((q) => q.id);
    const totalMins = allIds.reduce((sum, id) => sum + (questionMap.get(id)?.durationMinutes || 5), 0);
    scheduleDays[0].focus = 'Comprehensive Crash Course & Core Review';
    scheduleDays[0].questionIds = allIds;
    scheduleDays[0].minutes = Math.round(totalMins);
    return { days: scheduleDays };
  }

  // Distribute questions across days
  prioritized.forEach((q, idx) => {
    const dayIndex = idx % daysCount;
    if (!scheduleDays[dayIndex].questionIds.includes(q.id)) {
      scheduleDays[dayIndex].questionIds.push(q.id);
    }
  });

  // If days exceed questions (e.g. 14, 30, or 60 days for 8 questions),
  // assign spaced repetition review sessions to keep study cadence active
  for (let i = 0; i < daysCount; i++) {
    if (scheduleDays[i].questionIds.length === 0 && prioritized.length > 0) {
      const reviewQ = prioritized[i % prioritized.length];
      if (reviewQ && !scheduleDays[i].questionIds.includes(reviewQ.id)) {
        scheduleDays[i].questionIds.push(reviewQ.id);
      }
    }
  }

  // Calculate integer minutes and assign thematic focus per day
  for (let i = 0; i < daysCount; i++) {
    const dayObj = scheduleDays[i];
    const qList = dayObj.questionIds.map((id) => questionMap.get(id)).filter(Boolean);

    const dayMins = qList.reduce((sum, q) => sum + (Number.isInteger(q.durationMinutes) ? q.durationMinutes : 5), 0);
    dayObj.minutes = Math.round(dayMins);

    const categoriesInDay = [...new Set(qList.map((q) => q.category))];
    if (categoriesInDay.length === 1) {
      dayObj.focus = `${categoriesInDay[0]} Focus & Practice`;
    } else if (categoriesInDay.includes('Technical') && categoriesInDay.includes('Behavioral')) {
      dayObj.focus = 'Technical Problem Solving & STAR Behavioral Stories';
    } else if (i === daysCount - 1) {
      dayObj.focus = 'Final Mock Interview & Comprehensive Polish';
    } else if (categoriesInDay.length > 0) {
      dayObj.focus = `Deep Dive: ${categoriesInDay.join(' & ')}`;
    } else {
      dayObj.focus = 'Spaced Repetition & Concept Reinforcement';
    }
  }

  // DETERMINISTIC REPAIR STEP:
  // Verify that all must-have requirements are represented in the schedule
  const scheduledQIds = new Set(scheduleDays.flatMap((d) => d.questionIds));
  for (const mustReqId of mustReqIds) {
    const isCovered = questionBank.some(
      (q) => (q.requirementIds || []).includes(mustReqId) && scheduledQIds.has(q.id)
    );

    if (!isCovered) {
      const candidateQ = questionBank.find((q) => (q.requirementIds || []).includes(mustReqId));
      if (candidateQ) {
        // Place in day with lowest minutes
        let targetDay = scheduleDays[0];
        for (const d of scheduleDays) {
          if (d.minutes < targetDay.minutes && !d.questionIds.includes(candidateQ.id)) {
            targetDay = d;
          }
        }
        if (!targetDay.questionIds.includes(candidateQ.id)) {
          targetDay.questionIds.push(candidateQ.id);
          targetDay.minutes += Math.round(candidateQ.durationMinutes || 5);
        }
      }
    }
  }

  return { days: scheduleDays };
}

module.exports = {
  generateSchedule
};
