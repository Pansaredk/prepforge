const InterviewKit = require('../models/InterviewKit');
const { validateCompanyUrl } = require('../utils/urlValidator');
const { runKitGeneration } = require('../services/kitGenerationService');

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

    // Strict ownership check: prevent cross-user access
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
      // Synchronous execution (useful for automated test runs)
      const completedKit = await runKitGeneration(kit._id);
      return res.status(200).json({
        success: true,
        message: 'Kit generation completed',
        kit: completedKit
      });
    } else {
      // Asynchronous background execution (for UI polling)
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

module.exports = {
  createKit,
  listKits,
  getKitById,
  generateKit
};
