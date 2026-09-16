const InterviewKit = require('../models/InterviewKit');
const { executePipeline } = require('./pipelineEngine');

/**
 * Executes the complete AI interview prep pipeline for a kit and persists to MongoDB.
 * @param {string} kitId
 * @returns {Promise<object>}
 */
async function runKitGeneration(kitId) {
  const kit = await InterviewKit.findById(kitId);
  if (!kit) {
    throw new Error('Kit not found');
  }

  try {
    kit.status = 'generating';
    kit.error = null;
    await kit.save();

    console.log(`[KitGenerationService] Running pipeline for kit ${kitId}`);
    const generatedData = await executePipeline({
      title: kit.title,
      jobDescription: kit.jobDescription,
      companyUrl: kit.companyUrl,
      days: kit.days
    });

    kit.companyBrief = generatedData.companyBrief;
    kit.roleBreakdown = generatedData.roleBreakdown;
    kit.requirements = generatedData.requirements;
    kit.questionBank = generatedData.questionBank;
    kit.coverage = generatedData.coverage;
    kit.flashcards = generatedData.flashcards;
    kit.schedule = generatedData.schedule;
    kit.research = generatedData.research;
    kit.status = 'completed';

    await kit.save();
    console.log(`[KitGenerationService] Successfully completed kit ${kitId}`);
    return kit;
  } catch (error) {
    console.error(`[KitGenerationService] Error generating kit ${kitId}:`, error);
    kit.status = 'failed';
    kit.error = error.message || 'Pipeline generation failed';
    await kit.save();
    throw error;
  }
}

module.exports = {
  runKitGeneration
};
