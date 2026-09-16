const path = require('path');
module.paths.push(path.resolve(__dirname, '../backend/node_modules'));
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
}

const { generateSchedule } = require('../backend/src/services/scheduleService');
const { checkCoverage } = require('../backend/src/services/coverageService');
const { validateKit } = require('../backend/src/services/kitValidationService');
const { executePipeline } = require('../backend/src/services/pipelineEngine');

async function runAllTests() {
  console.log('=== RUNNING PREPFORGE AUTOMATED TEST SUITE ===\n');
  let failures = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`);
      failures++;
    }
  }

  // --- 1. SCHEDULE ALLOCATION TESTS ---
  console.log('\n--- 1. Schedule Allocation Invariants ---');
  const sampleQuestions = [
    { id: 'q-001', category: 'Technical', durationMinutes: 10, requirementIds: ['req-001'] },
    { id: 'q-002', category: 'Technical', durationMinutes: 8, requirementIds: ['req-002'] },
    { id: 'q-003', category: 'Behavioral', durationMinutes: 6, requirementIds: ['req-003'] },
    { id: 'q-004', category: 'Role-specific', durationMinutes: 12, requirementIds: ['req-001'] }
  ];
  const sampleReqs = [
    { id: 'req-001', text: 'React', must: true, nice: false },
    { id: 'req-002', text: 'Node', must: true, nice: false },
    { id: 'req-003', text: 'Communication', must: false, nice: true }
  ];

  // 1-Day Schedule
  const sched1 = generateSchedule(1, sampleQuestions, sampleReqs);
  assert(sched1 && sched1.days.length === 1, 'Schedule allocation: days = 1 produces exact day count 1');
  assert(Number.isInteger(sched1.days[0].minutes), 'Schedule allocation: days = 1 minutes is integer');
  assert(sched1.days[0].questionIds.length === 4, 'Schedule allocation: days = 1 includes all questions');

  // 60-Day Schedule
  const sched60 = generateSchedule(60, sampleQuestions, sampleReqs);
  assert(sched60 && sched60.days.length === 60, 'Schedule allocation: days = 60 produces exact day count 60');
  assert(sched60.days.every((d) => Number.isInteger(d.minutes)), 'Schedule allocation: all 60 days have integer minutes');
  const validQIdSet = new Set(sampleQuestions.map((q) => q.id));
  assert(sched60.days.every((d) => d.questionIds.every((id) => validQIdSet.has(id))), 'Schedule allocation: all scheduled question IDs are valid');

  // Schedule must-have requirement coverage
  const allScheduledQIds = new Set(sched60.days.flatMap((d) => d.questionIds));
  const mustReq1Covered = sampleQuestions.some((q) => q.requirementIds.includes('req-001') && allScheduledQIds.has(q.id));
  const mustReq2Covered = sampleQuestions.some((q) => q.requirementIds.includes('req-002') && allScheduledQIds.has(q.id));
  assert(mustReq1Covered && mustReq2Covered, 'Schedule allocation: all must-have requirements represented in schedule');

  // --- 2. DETERMINISTIC COVERAGE CHECKER TESTS ---
  console.log('\n--- 2. Deterministic Coverage Checker ---');
  const partialQuestions = [
    { id: 'q-001', requirementIds: ['req-001'] }
  ];
  const cov1 = checkCoverage(sampleReqs, partialQuestions, 1);
  assert(cov1.mustCovered.includes('req-001'), 'Coverage: identifies covered must-have requirement');
  assert(cov1.mustUncovered.includes('req-002'), 'Coverage: identifies uncovered must-have requirement');
  assert(cov1.isComplete === false, 'Coverage: reports isComplete = false when must-have is uncovered');

  // Full coverage
  const fullQuestions = [
    { id: 'q-001', requirementIds: ['req-001'] },
    { id: 'q-002', requirementIds: ['req-002'] }
  ];
  const cov2 = checkCoverage(sampleReqs, fullQuestions, 2);
  assert(cov2.mustCovered.length === 2 && cov2.mustUncovered.length === 0, 'Coverage: all must-have requirements covered');
  assert(cov2.isComplete === true, 'Coverage: reports isComplete = true when all must-haves covered');

  // --- 3. KIT STRUCTURE VALIDATION TESTS ---
  console.log('\n--- 3. Kit Structural Invariants Validation ---');
  const validKitData = {
    title: 'Senior Engineer',
    requirements: [
      { id: 'req-001', text: 'React', must: true, nice: false },
      { id: 'req-002', text: 'Node', must: true, nice: false }
    ],
    questionBank: [
      {
        id: 'q-001',
        category: 'Technical',
        question: 'Explain React render cycle',
        answerOutline: ['Virtual DOM', 'Reconciliation', 'Commit'],
        durationMinutes: 6,
        requirementIds: ['req-001']
      },
      {
        id: 'q-002',
        category: 'Technical',
        question: 'Explain Node event loop',
        answerOutline: ['Call stack', 'Libuv', 'Microtasks'],
        durationMinutes: 8,
        requirementIds: ['req-002']
      }
    ],
    flashcards: [
      { id: 'fc-001', questionId: 'q-001', front: 'React render cycle', back: 'Key takeaways' },
      { id: 'fc-002', questionId: 'q-002', front: 'Node event loop', back: 'Key takeaways' }
    ],
    schedule: {
      days: [
        { day: 1, focus: 'React', questionIds: ['q-001'], minutes: 6 },
        { day: 2, focus: 'Node', questionIds: ['q-002'], minutes: 8 }
      ]
    }
  };

  const val1 = validateKit(validKitData, 2);
  assert(val1.valid === true, 'Validation: valid kit structure accepted');

  // Invalid requirement ID reference
  const invalidRefKit = JSON.parse(JSON.stringify(validKitData));
  invalidRefKit.questionBank[0].requirementIds = ['req-nonexistent'];
  const val2 = validateKit(invalidRefKit, 2);
  assert(val2.valid === false, 'Validation: rejects question referencing non-existent requirement ID');

  // Invalid durationMinutes (decimal)
  const decimalDurationKit = JSON.parse(JSON.stringify(validKitData));
  decimalDurationKit.questionBank[0].durationMinutes = 5.5;
  const val3 = validateKit(decimalDurationKit, 2);
  assert(val3.valid === false, 'Validation: rejects decimal durationMinutes');

  // Invalid flashcard reference
  const invalidFcKit = JSON.parse(JSON.stringify(validKitData));
  invalidFcKit.flashcards[0].questionId = 'q-999';
  const val4 = validateKit(invalidFcKit, 2);
  assert(val4.valid === false, 'Validation: rejects flashcard referencing non-existent question ID');

  // --- 4. BATCH EVALUATOR RESILIENCE TEST ---
  console.log('\n--- 4. Batch Evaluator Pipeline Resilience ---');
  try {
    const unreachableResult = await executePipeline({
      title: 'Resilience Test Role',
      jobDescription: 'Frontend React and JavaScript development.',
      companyUrl: 'https://definitely-unreachable-domain-123456789.com',
      days: 3
    });
    assert(unreachableResult && unreachableResult.requirements.length > 0, 'Pipeline resilience: succeeds even when company URL is unreachable');
    assert(unreachableResult.schedule.days.length === 3, 'Pipeline resilience: exact day count preserved on research failure');
  } catch (err) {
    assert(false, `Pipeline resilience threw unexpected error: ${err.message}`);
  }

  console.log('\n==============================================');
  if (failures === 0) {
    console.log('ALL MANDATORY AUTOMATED TESTS PASSED (16/16)!');
  } else {
    console.error(`FAILED: ${failures} test(s) failed.`);
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('[Test] Fatal test suite error:', err);
  process.exit(1);
});
