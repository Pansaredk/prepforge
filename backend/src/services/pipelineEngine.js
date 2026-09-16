const { researchCompany } = require('./researchService');
const { extractRequirements } = require('./requirementService');
const { generateBriefs } = require('./briefService');
const { generateQuestionBank, generateTargetedQuestions } = require('./questionService');
const { checkCoverage } = require('./coverageService');
const { generateFlashcards } = require('./flashcardService');
const { generateSchedule } = require('./scheduleService');
const { validateKit } = require('./kitValidationService');

const MAX_COVERAGE_PASSES = 2;

/**
 * Executes the complete 10-step AI interview preparation pipeline in-memory.
 * Used by both web kit generation and batch evaluation command.
 * @param {{ title: string, jobDescription: string, companyUrl: string, days: number }} params
 * @returns {Promise<object>} Generated kit data object
 */
async function executePipeline({ title, jobDescription, companyUrl, days }) {
  const daysInt = Math.max(1, Math.min(60, parseInt(days, 10) || 5));

  // 1. Company Research (bounded crawl with error resilience)
  const research = await researchCompany(companyUrl);
  const researchData = {
    company: research.company || { url: companyUrl, title: '', summary: '', sources: [] },
    hiring: research.hiring || { found: false, url: '', title: '', summary: '', sources: [] },
    sources: research.sources || [],
    errors: research.errors || [],
    publicDiscussion: research.publicDiscussion || { available: false, sources: [] }
  };

  // 2. Extract JD Requirements
  const requirements = await extractRequirements(jobDescription, title);

  // 3. Generate Company Brief & Role Breakdown
  const briefs = await generateBriefs(jobDescription, title, companyUrl, research.combinedText);

  // 4. Generate Initial Question Bank
  let questionBank = await generateQuestionBank(jobDescription, title, requirements, companyUrl);

  // 5. Deterministic Requirement Coverage Check & Second Pass
  let coverage = checkCoverage(requirements, questionBank, 1);

  if (!coverage.isComplete && MAX_COVERAGE_PASSES >= 2) {
    const uncoveredReqs = requirements.filter((r) => coverage.mustUncovered.includes(r.id));
    const allReqIds = requirements.map((r) => r.id);

    const additionalQuestions = await generateTargetedQuestions(
      uncoveredReqs,
      questionBank.length,
      allReqIds
    );

    questionBank = [...questionBank, ...additionalQuestions];
    coverage = checkCoverage(requirements, questionBank, 2);
  }

  // 6. Generate Flashcards
  const flashcards = generateFlashcards(questionBank);

  // 7. Generate Deterministic Study Schedule
  const schedule = generateSchedule(daysInt, questionBank, requirements);

  // 8. Structural Validation
  const kitData = {
    title: (title || 'Target Role').trim(),
    jobDescription: (jobDescription || '').trim(),
    companyUrl: (companyUrl || '').trim(),
    days: daysInt,
    companyBrief: briefs.companyBrief,
    roleBreakdown: briefs.roleBreakdown,
    requirements,
    questionBank,
    coverage,
    flashcards,
    schedule,
    research: researchData
  };

  const validation = validateKit(kitData, daysInt);
  if (!validation.valid) {
    console.warn('[PipelineEngine] Structural validation warnings:', validation.errors);
  }

  return kitData;
}

module.exports = {
  executePipeline
};
