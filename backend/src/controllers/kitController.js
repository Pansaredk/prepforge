const InterviewKit = require('../models/InterviewKit');
const { validateCompanyUrl } = require('../utils/urlValidator');
const { runKitGeneration } = require('../services/kitGenerationService');
const { generateBriefs } = require('../services/briefService');
const { generateQuestionBank } = require('../services/questionService');
const { generateSchedule } = require('../services/scheduleService');
const { generateFlashcards } = require('../services/flashcardService');
const { checkCoverage } = require('../services/coverageService');

/**
 * Create a new interview kit
 * POST /api/kits
 */
const createKit = async (req, res, next) => {
  try {
    const { title, jobDescription, companyUrl, days } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Kit title is required'
      });
    }

    if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Job description is required'
      });
    }

    const urlCheck = validateCompanyUrl(companyUrl);
    if (!urlCheck.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid company URL: ${urlCheck.error}`
      });
    }

    const daysInt = parseInt(days, 10);
    if (isNaN(daysInt) || !Number.isInteger(Number(days)) || daysInt < 1 || daysInt > 60) {
      return res.status(400).json({
        success: false,
        message: 'Preparation days must be an integer between 1 and 60'
      });
    }

    const kit = await InterviewKit.create({
      userId: req.userId,
      title: title.trim(),
      jobDescription: jobDescription.trim(),
      companyUrl: urlCheck.normalizedUrl,
      days: daysInt,
      status: 'draft'
    });

    return res.status(201).json({
      success: true,
      kit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all kits owned by the authenticated user
 * GET /api/kits
 */
const listKits = async (req, res, next) => {
  try {
    const kits = await InterviewKit.find({ userId: req.userId })
      .select('title companyUrl days status createdAt updatedAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      kits
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific kit by ID
 * GET /api/kits/:id
 */
const getKitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Kit not found'
      });
    }

    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this kit'
      });
    }

    return res.status(200).json({
      success: true,
      kit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger generation for a kit
 * POST /api/kits/:id/generate
 */
const generateKit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isSync = req.query.sync === 'true';

    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Kit not found'
      });
    }

    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this kit'
      });
    }

    if (kit.status === 'generating') {
      return res.status(400).json({
        success: false,
        message: 'Kit is already generating'
      });
    }

    if (isSync) {
      const completedKit = await runKitGeneration(kit._id);
      return res.status(200).json({
        success: true,
        message: 'Kit generation completed',
        kit: completedKit
      });
    } else {
      runKitGeneration(kit._id).catch((err) => {
        console.error(`[KitController] Background generation failed for ${id}:`, err);
      });

      return res.status(202).json({
        success: true,
        message: 'Kit generation started',
        kitId: kit._id,
        status: 'generating'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * General update for a kit (title, companyBrief, requirements)
 * PATCH /api/kits/:id
 */
const updateKit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }

    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { title, companyBrief, roleBreakdown, requirements } = req.body;

    if (title && typeof title === 'string') kit.title = title.trim();
    if (companyBrief && typeof companyBrief === 'object') {
      const existing = (kit.companyBrief && typeof kit.companyBrief.toObject === 'function')
        ? kit.companyBrief.toObject()
        : (kit.companyBrief || {});
      kit.companyBrief = { ...existing, ...companyBrief };
    }
    if (roleBreakdown && typeof roleBreakdown === 'object') {
      const existing = (kit.roleBreakdown && typeof kit.roleBreakdown.toObject === 'function')
        ? kit.roleBreakdown.toObject()
        : (kit.roleBreakdown || {});
      kit.roleBreakdown = { ...existing, ...roleBreakdown };
    }
    if (Array.isArray(requirements)) {
      kit.requirements = requirements;
      kit.coverage = checkCoverage(kit.requirements, kit.questionBank, kit.coverage?.passes || 1);
    }

    await kit.save();
    return res.status(200).json({ success: true, kit });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new question to the kit question bank
 * POST /api/kits/:id/questions
 */
const addQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }

    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { question, category, durationMinutes, answerOutline, requirementIds } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, message: 'Question text is required' });
    }

    // Determine next unique question ID
    const existingNums = kit.questionBank
      .map((q) => parseInt((q.id || '').replace('q-', ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = (existingNums.length > 0 ? Math.max(...existingNums) : 0) + 1;
    const newQId = `q-${String(nextNum).padStart(3, '0')}`;

    const durationInt = parseInt(durationMinutes, 10) || 5;

    let outline = [];
    if (Array.isArray(answerOutline)) {
      outline = answerOutline.map((s) => String(s).trim()).filter(Boolean);
    }
    if (outline.length === 0) {
      outline = ['Key concept definition', 'Practical application and examples', 'Trade-offs and conclusion'];
    }

    const newQuestion = {
      id: newQId,
      category: category || 'Technical',
      question: question.trim(),
      answerOutline: outline,
      requirementIds: Array.isArray(requirementIds) ? requirementIds : [],
      durationMinutes: durationInt,
      source: 'user',
      edited: true,
      pinned: false
    };

    kit.questionBank.push(newQuestion);

    // Create corresponding flashcard
    const nextFcNum = kit.flashcards.length + 1;
    const newFc = {
      id: `fc-${String(nextFcNum).padStart(3, '0')}`,
      questionId: newQId,
      front: newQuestion.question,
      back: outline.slice(0, 3).map((pt, i) => `${i + 1}. ${pt}`).join('\n'),
      confidence: null,
      covered: false
    };
    kit.flashcards.push(newFc);

    // Update coverage
    kit.coverage = checkCoverage(kit.requirements, kit.questionBank, kit.coverage?.passes || 1);

    await kit.save();
    return res.status(201).json({ success: true, kit, question: newQuestion });
  } catch (error) {
    next(error);
  }
};

/**
 * Edit an existing question
 * PATCH /api/kits/:id/questions/:questionId
 */
const updateQuestion = async (req, res, next) => {
  try {
    const { id, questionId } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }

    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const qIndex = kit.questionBank.findIndex((q) => q.id === questionId);
    if (qIndex === -1) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const { question, category, durationMinutes, answerOutline, requirementIds, pinned } = req.body;

    const target = kit.questionBank[qIndex];
    if (question !== undefined && typeof question === 'string') {
      target.question = question.trim();
      target.edited = true;
    }
    if (category !== undefined && typeof category === 'string') {
      target.category = category;
      target.edited = true;
    }
    if (durationMinutes !== undefined) {
      const dInt = parseInt(durationMinutes, 10);
      if (!isNaN(dInt) && dInt > 0) {
        target.durationMinutes = dInt;
        target.edited = true;
      }
    }
    if (Array.isArray(answerOutline)) {
      target.answerOutline = answerOutline.map((s) => String(s).trim()).filter(Boolean);
      target.edited = true;
    }
    if (Array.isArray(requirementIds)) {
      target.requirementIds = requirementIds;
      target.edited = true;
    }
    if (pinned !== undefined) {
      target.pinned = Boolean(pinned);
    }

    // Synchronize flashcard front if question was updated
    const fcIndex = kit.flashcards.findIndex((fc) => fc.questionId === questionId);
    if (fcIndex !== -1 && target.question) {
      kit.flashcards[fcIndex].front = target.question;
      if (Array.isArray(target.answerOutline) && target.answerOutline.length > 0) {
        kit.flashcards[fcIndex].back = target.answerOutline.slice(0, 3).map((pt, i) => `${i + 1}. ${pt}`).join('\n');
      }
    }

    // Update coverage
    kit.coverage = checkCoverage(kit.requirements, kit.questionBank, kit.coverage?.passes || 1);

    await kit.save();
    return res.status(200).json({ success: true, kit, question: target });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a question from the question bank
 * DELETE /api/kits/:id/questions/:questionId
 */
const deleteQuestion = async (req, res, next) => {
  try {
    const { id, questionId } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }

    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Remove question
    kit.questionBank = kit.questionBank.filter((q) => q.id !== questionId);

    // Remove matching flashcard
    kit.flashcards = kit.flashcards.filter((fc) => fc.questionId !== questionId);

    // Remove from schedule and adjust minutes
    if (kit.schedule && Array.isArray(kit.schedule.days)) {
      const qMap = new Map();
      kit.questionBank.forEach((q) => qMap.set(q.id, q));

      kit.schedule.days.forEach((day) => {
        day.questionIds = day.questionIds.filter((qid) => qid !== questionId);
        day.minutes = day.questionIds.reduce((sum, qid) => sum + (qMap.get(qid)?.durationMinutes || 5), 0);
      });
    }

    // Update coverage
    kit.coverage = checkCoverage(kit.requirements, kit.questionBank, kit.coverage?.passes || 1);

    await kit.save();
    return res.status(200).json({ success: true, kit });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder questions in question bank
 * PUT /api/kits/:id/questions/reorder
 */
const reorderQuestions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questionIds } = req.body;

    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, message: 'questionIds array required' });
    }

    const kit = await InterviewKit.findById(id);
    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }
    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const qMap = new Map();
    kit.questionBank.forEach((q) => qMap.set(q.id, q));

    const reordered = [];
    questionIds.forEach((qid) => {
      if (qMap.has(qid)) {
        reordered.push(qMap.get(qid));
        qMap.delete(qid);
      }
    });

    // Append any questions not included in request array
    qMap.forEach((q) => reordered.push(q));

    kit.questionBank = reordered;
    await kit.save();
    return res.status(200).json({ success: true, kit });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a flashcard (front, back, confidence, covered)
 * PATCH /api/kits/:id/flashcards/:flashcardId
 */
const updateFlashcard = async (req, res, next) => {
  try {
    const { id, flashcardId } = req.params;
    const { front, back, confidence, covered } = req.body;

    const kit = await InterviewKit.findById(id);
    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }
    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const fcIndex = kit.flashcards.findIndex((fc) => fc.id === flashcardId);
    if (fcIndex === -1) {
      return res.status(404).json({ success: false, message: 'Flashcard not found' });
    }

    const target = kit.flashcards[fcIndex];
    if (front !== undefined && typeof front === 'string') target.front = front.trim();
    if (back !== undefined && typeof back === 'string') target.back = back.trim();
    if (confidence !== undefined) target.confidence = confidence;
    if (covered !== undefined) target.covered = Boolean(covered);

    await kit.save();
    return res.status(200).json({ success: true, kit, flashcard: target });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate Company Brief & Role Breakdown
 * POST /api/kits/:id/regenerate/brief
 */
const regenerateBrief = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }
    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const researchText = (kit.research?.sources || []).map((s) => s.title).join(' ');
    const briefs = await generateBriefs(kit.jobDescription, kit.title, kit.companyUrl, researchText);

    kit.companyBrief = briefs.companyBrief;
    kit.roleBreakdown = briefs.roleBreakdown;

    await kit.save();
    return res.status(200).json({ success: true, kit });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate questions in a specific category while preserving all pinned, edited, and user-created questions
 * POST /api/kits/:id/regenerate/questions/:category
 */
const regenerateCategoryQuestions = async (req, res, next) => {
  try {
    const { id, category } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }
    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // 1. Separate questions: keep all other categories, and keep pinned/edited/user questions
    const preserved = [];
    const questionsToReplaceCount = [];

    kit.questionBank.forEach((q) => {
      if (q.category !== category) {
        preserved.push(q);
      } else if (q.pinned || q.edited || q.source === 'user') {
        preserved.push(q); // Strictly preserve manual edits and pinned questions!
      } else {
        questionsToReplaceCount.push(q);
      }
    });

    // 2. Generate fresh questions for the category
    const freshBank = await generateQuestionBank(kit.jobDescription, kit.title, kit.requirements, kit.companyUrl);
    const candidateCategoryQuestions = freshBank.filter((q) => q.category === category);

    // Assign new unique IDs to avoid any collision
    const existingIds = new Set(preserved.map((q) => q.id));
    let nextIdNum = 1;

    const newQuestions = [];
    candidateCategoryQuestions.forEach((q) => {
      while (existingIds.has(`q-${String(nextIdNum).padStart(3, '0')}`)) {
        nextIdNum++;
      }
      const newId = `q-${String(nextIdNum).padStart(3, '0')}`;
      existingIds.add(newId);

      newQuestions.push({
        ...q,
        id: newId,
        source: 'generated',
        edited: false,
        pinned: false
      });
      nextIdNum++;
    });

    kit.questionBank = [...preserved, ...newQuestions];

    // Synchronize flashcards: preserve flashcards for preserved questions, add for new questions
    const preservedQIds = new Set(preserved.map((q) => q.id));
    const keptFlashcards = kit.flashcards.filter((fc) => preservedQIds.has(fc.questionId));
    const newFlashcards = generateFlashcards(newQuestions);

    kit.flashcards = [...keptFlashcards, ...newFlashcards];

    // Update coverage
    kit.coverage = checkCoverage(kit.requirements, kit.questionBank, kit.coverage?.passes || 1);

    await kit.save();
    return res.status(200).json({ success: true, kit });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate Study Schedule using current question bank and requirements
 * POST /api/kits/:id/regenerate/schedule
 */
const regenerateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({ success: false, message: 'Kit not found' });
    }
    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    kit.schedule = generateSchedule(kit.days, kit.questionBank, kit.requirements);
    await kit.save();

    return res.status(200).json({ success: true, kit });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a kit and all its embedded data
 * DELETE /api/kits/:id
 */
const deleteKit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const kit = await InterviewKit.findById(id);

    if (!kit) {
      return res.status(404).json({
        success: false,
        message: 'Kit not found'
      });
    }

    if (kit.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this kit'
      });
    }

    await InterviewKit.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Kit deleted successfully',
      kitId: id
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createKit,
  listKits,
  getKitById,
  generateKit,
  updateKit,
  deleteKit,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  updateFlashcard,
  regenerateBrief,
  regenerateCategoryQuestions,
  regenerateSchedule
};
