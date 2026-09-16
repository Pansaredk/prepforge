const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/kitController');

const router = express.Router();

// Enforce authentication across all kit endpoints
router.use(requireAuth);

// Core CRUD
router.post('/', createKit);
router.get('/', listKits);
router.get('/:id', getKitById);
router.patch('/:id', updateKit);
router.delete('/:id', deleteKit);
router.post('/:id/generate', generateKit);

// Question Builder Endpoints
router.post('/:id/questions', addQuestion);
router.put('/:id/questions/reorder', reorderQuestions);
router.patch('/:id/questions/:questionId', updateQuestion);
router.delete('/:id/questions/:questionId', deleteQuestion);

// Flashcards & Practice Endpoints
router.patch('/:id/flashcards/:flashcardId', updateFlashcard);

// Selective Regeneration Endpoints
router.post('/:id/regenerate/brief', regenerateBrief);
router.post('/:id/regenerate/questions/:category', regenerateCategoryQuestions);
router.post('/:id/regenerate/schedule', regenerateSchedule);

module.exports = router;
