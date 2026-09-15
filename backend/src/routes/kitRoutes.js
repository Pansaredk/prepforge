const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
  createKit,
  listKits,
  getKitById,
  generateKit
} = require('../controllers/kitController');

const router = express.Router();

// Enforce authentication across all kit endpoints
router.use(requireAuth);

router.post('/', createKit);
router.get('/', listKits);
router.get('/:id', getKitById);
router.post('/:id/generate', generateKit);

module.exports = router;
