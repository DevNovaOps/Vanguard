import riskService from '../services/riskService.js';

/**
 * @desc    Get all node risk profiles
 * @route   GET /api/risk
 * @access  Private (Admin, SafetyOfficer, Manager, Operator)
 */
export const getRisks = async (req, res, next) => {
  try {
    const risks = await riskService.getRisks();
    res.status(200).json({
      success: true,
      count: risks.length,
      risks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get risk profile of a specific railway node
 * @route   GET /api/risk/:nodeId
 * @access  Private (Admin, SafetyOfficer, Manager, Operator)
 */
export const getRiskByNodeId = async (req, res, next) => {
  try {
    const risk = await riskService.getRiskByNodeId(req.params.nodeId);
    res.status(200).json({
      success: true,
      risk
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Recalculate risk scores for all railway nodes
 * @route   POST /api/risk/calculate
 * @access  Private (Admin, SafetyOfficer only)
 */
export const calculateAllRisks = async (req, res, next) => {
  try {
    const count = await riskService.calculateAllRisks(req);
    res.status(200).json({
      success: true,
      message: `Global risk scores recalculated successfully for ${count} nodes`,
      count
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get risk statistics for executive dashboard summaries
 * @route   GET /api/risk/dashboard
 * @access  Private (Admin, SafetyOfficer, Manager, Operator)
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await riskService.getDashboardStats();
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};
