/**
 * Health check controller
 * GET /api/health
 */
const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running'
  });
};

module.exports = {
  getHealth
};
