const fs = require('fs');
const path = require('path');
module.paths.push(path.resolve(__dirname, '../backend/node_modules'));
const dotenv = require('dotenv');

// Load environment variables from .env or .env.example
dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
}

const { executePipeline } = require('../backend/src/services/pipelineEngine');

/**
 * Parses CLI arguments for --input and --output flags
 */
function parseArgs(args) {
  let input = 'cases/sample.json';
  let output = 'cases/output.json';
  const positional = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--input' || arg === '-i') {
      input = args[i + 1] || input;
      i++;
    } else if (arg === '--output' || arg === '-o') {
      output = args[i + 1] || output;
      i++;
    } else if (arg.startsWith('--input=')) {
      input = arg.split('=')[1] || input;
    } else if (arg.startsWith('--output=')) {
      output = arg.split('=')[1] || output;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length > 0 && input === 'cases/sample.json') {
    input = positional[0];
  }
  if (positional.length > 1 && output === 'cases/output.json') {
    output = positional[1];
  }

  return { input, output };
}

/**
 * Formats pipeline output strictly matching TRAO Appendix B JSON schema
 */
function formatCaseOutput(caseInput, generatedKit) {
  return {
    id: caseInput.id,
    status: 'completed',
    title: generatedKit.title || caseInput.id,
    company_url: caseInput.company_url,
    companyUrl: caseInput.company_url,
    days: generatedKit.days,
    company_brief: {
      overview: generatedKit.companyBrief?.overview || '',
      products: generatedKit.companyBrief?.products || [],
      industry: generatedKit.companyBrief?.industry || '',
      culture: generatedKit.companyBrief?.culture || [],
      interview_context: generatedKit.companyBrief?.interviewContext || ''
    },
    companyBrief: generatedKit.companyBrief,
    role_breakdown: {
      summary: generatedKit.roleBreakdown?.summary || '',
      responsibilities: generatedKit.roleBreakdown?.responsibilities || [],
      required_skills: generatedKit.roleBreakdown?.requiredSkills || [],
      nice_to_have_skills: generatedKit.roleBreakdown?.niceToHaveSkills || [],
      interview_focus_areas: generatedKit.roleBreakdown?.interviewFocusAreas || []
    },
    roleBreakdown: generatedKit.roleBreakdown,
    requirements: (generatedKit.requirements || []).map((r) => ({
      id: r.id,
      text: r.text,
      must: r.must,
      nice: r.nice
    })),
    questions: (generatedKit.questionBank || []).map((q) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      answer_outline: q.answerOutline,
      answerOutline: q.answerOutline,
      requirement_ids: q.requirementIds,
      requirementIds: q.requirementIds,
      duration_minutes: q.durationMinutes,
      durationMinutes: q.durationMinutes,
      source: q.source || 'generated'
    })),
    questionBank: generatedKit.questionBank,
    flashcards: (generatedKit.flashcards || []).map((fc) => ({
      id: fc.id,
      question_id: fc.questionId,
      questionId: fc.questionId,
      front: fc.front,
      back: fc.back
    })),
    schedule: {
      days: (generatedKit.schedule?.days || []).map((d) => ({
        day: d.day,
        focus: d.focus,
        question_ids: d.questionIds,
        questionIds: d.questionIds,
        minutes: d.minutes
      }))
    },
    coverage: {
      passes: generatedKit.coverage?.passes || 1,
      must_covered: generatedKit.coverage?.mustCovered || [],
      mustCovered: generatedKit.coverage?.mustCovered || [],
      must_uncovered: generatedKit.coverage?.mustUncovered || [],
      mustUncovered: generatedKit.coverage?.mustUncovered || [],
      nice_covered: generatedKit.coverage?.niceCovered || [],
      niceCovered: generatedKit.coverage?.niceCovered || [],
      nice_uncovered: generatedKit.coverage?.niceUncovered || [],
      niceUncovered: generatedKit.coverage?.niceUncovered || []
    },
    research: {
      sources: generatedKit.research?.sources || [],
      errors: generatedKit.research?.errors || [],
      public_discussion: generatedKit.research?.publicDiscussion || { available: false, sources: [] }
    }
  };
}

async function runEvaluation() {
  const { input, output } = parseArgs(process.argv.slice(2));

  console.log(`[Evaluate] Reading cases from: ${input}`);
  const inputPath = path.resolve(process.cwd(), input);

  if (!fs.existsSync(inputPath)) {
    console.error(`[Evaluate] Input file not found: ${inputPath}`);
    process.exit(1);
  }

  let casesData;
  try {
    const raw = fs.readFileSync(inputPath, 'utf8');
    casesData = JSON.parse(raw);
  } catch (err) {
    console.error(`[Evaluate] Failed to parse input JSON: ${err.message}`);
    process.exit(1);
  }

  const casesList = Array.isArray(casesData) ? casesData : (casesData.cases || []);
  console.log(`[Evaluate] Total cases to evaluate: ${casesList.length}`);

  const evaluatedCases = [];
  let completedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < casesList.length; i++) {
    const caseItem = casesList[i];
    console.log(`\n[Evaluate] (${i + 1}/${casesList.length}) Processing case: ${caseItem.id || `case-${i + 1}`}`);

    try {
      const generated = await executePipeline({
        title: caseItem.title || caseItem.id || 'Software Engineer',
        jobDescription: caseItem.jd || caseItem.jobDescription || caseItem.job_description || '',
        companyUrl: caseItem.company_url || caseItem.companyUrl || 'https://example.com',
        days: caseItem.days || 5
      });

      const formatted = formatCaseOutput(caseItem, generated);
      evaluatedCases.push(formatted);
      completedCount++;
      console.log(`[Evaluate] Successfully generated case ${caseItem.id}`);
    } catch (err) {
      console.error(`[Evaluate] Case ${caseItem.id} failed: ${err.message}`);
      failedCount++;
      evaluatedCases.push({
        id: caseItem.id,
        status: 'failed',
        company_url: caseItem.company_url,
        days: caseItem.days,
        error: err.message
      });
      // Continue to next case without crashing!
    }
  }

  const finalOutput = {
    assessment_id: 'FS-AI-INTERVIEW-01',
    generated_at: new Date().toISOString(),
    summary: {
      total: casesList.length,
      completed: completedCount,
      failed: failedCount
    },
    cases: evaluatedCases
  };

  const outputPath = path.resolve(process.cwd(), output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf8');

  console.log(`\n====================================================`);
  console.log(`[Evaluate] Evaluation complete!`);
  console.log(`[Evaluate] Total: ${casesList.length} | Completed: ${completedCount} | Failed: ${failedCount}`);
  console.log(`[Evaluate] Output saved to: ${outputPath}`);
}

runEvaluation().catch((err) => {
  console.error('[Evaluate] Fatal error in evaluation runner:', err);
  process.exit(1);
});
