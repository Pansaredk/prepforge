const InterviewKit = require('../models/InterviewKit');
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
 * Executes the complete Stage 3 interview prep pipeline for a kit.
 * @param {string} kitId
 * @returns {Promise<object>}
 */
async function runKitGeneration(kitId) {
  const kit = await InterviewKit.findById(kitId);
  if (!kit) {
    throw new Error('Kit not found');
  }

  try {
    // 1. Set status to generating
    kit.status = 'generating';
    kit.error = null;
    await kit.save();

    // 2. Company Research
    console.log(`[Pipeline] Step 1: Researching company for kit ${kitId}`);
    const research = await researchCompany(kit.companyUrl);
    kit.research = {
      sources: research.sources || [],
      errors: research.errors || [],
      publicDiscussion: research.publicDiscussion || { available: false, sources: [] }
    };

    // 3. Extract JD Requirements
    console.log(`[Pipeline] Step 2: Extracting requirements for kit ${kitId}`);
    const requirements = await extractRequirements(kit.jobDescription, kit.title);
    kit.requirements = requirements;

    // 4. Generate Company Brief & Role Breakdown
    console.log(`[Pipeline] Step 3: Generating company brief and role breakdown`);
    const briefs = await generateBriefs(kit.jobDescription, kit.title, kit.companyUrl, research.combinedText);
    kit.companyBrief = briefs.companyBrief;
    kit.roleBreakdown = briefs.roleBreakdown;

    // 5. Generate Initial Question Bank
    console.log(`[Pipeline] Step 4: Generating question bank`);
    let questionBank = await generateQuestionBank(kit.jobDescription, kit.title, requirements, kit.companyUrl);

    // 6. Deterministic Coverage Checking & Second Pass Generation
    console.log(`[Pipeline] Step 5: Checking requirement coverage`);
    let coverage = checkCoverage(requirements, questionBank, 1);

    if (!coverage.isComplete && MAX_COVERAGE_PASSES >= 2) {
      console.log(`[Pipeline] Step 6: Second pass generation for uncovered must-haves:`, coverage.mustUncovered);
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

    kit.questionBank = questionBank;
    kit.coverage = coverage;

    // 7. Generate Flashcards
    console.log(`[Pipeline] Step 7: Generating flashcards`);
    const flashcards = generateFlashcards(questionBank);
    kit.flashcards = flashcards;

    // 8. Generate Deterministic Study Schedule
    console.log(`[Pipeline] Step 8: Generating deterministic schedule for ${kit.days} days`);
    const schedule = generateSchedule(kit.days, questionBank, requirements);
    kit.schedule = schedule;

    // 9. Structural Validation
    console.log(`[Pipeline] Step 9: Validating complete kit structure`);
    const validation = validateKit(kit.toObject(), kit.days);
    if (!validation.valid) {
      console.warn(`[Pipeline] Kit validation warnings:`, validation.errors);
      // Even if minor non-fatal warnings exist, log them
    }

    // 10. Mark completed and save
    kit.status = 'completed';
    await kit.save();
    console.log(`[Pipeline] Successfully completed kit generation for ${kitId}`);

    return kit;
  } catch (error) {
    console.error(`[Pipeline] Error generating kit ${kitId}:`, error);
    kit.status = 'failed';
    kit.error = error.message || 'Pipeline generation failed';
    await kit.save();
    throw error;
  }
}

module.exports = {
  runKitGeneration
};
