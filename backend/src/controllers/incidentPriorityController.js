import incidentPriorityService from '../services/incidentPriorityService.js';

/**
 * @desc    Get sorted incidents by dynamic max heap priority
 * @route   GET /api/incidents/prioritized
 * @access  Private (Admin, SafetyOfficer, Operator, Manager)
 */
export const getPrioritizedQueue = async (req, res, next) => {
  try {
    const queue = await incidentPriorityService.getPrioritizedQueue();
    const stats = await incidentPriorityService.getPriorityDashboard();

    res.status(200).json({
      success: true,
      totalIncidents: queue.length,
      highestPriority: queue[0] || null,
      queue,
      statistics: {
        criticalCount: stats.criticalCount,
        highCount: stats.highCount,
        mediumCount: stats.mediumCount,
        lowCount: stats.lowCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get priority rank position of a single incident
 * @route   GET /api/incidents/priority/:id
 * @access  Private (Admin, SafetyOfficer, Operator, Manager)
 */
export const getIncidentPriorityRank = async (req, res, next) => {
  try {
    const rank = await incidentPriorityService.getIncidentPriorityRank(req.params.id);
    if (rank === null) {
      return res.status(404).json({
        success: false,
        message: `Incident position or rank not resolved for ID ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      incidentId: req.params.id,
      priorityRank: rank
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get summary counts and top prioritized incident for priority dashboard
 * @route   GET /api/incidents/priority-dashboard
 * @access  Private (Admin, SafetyOfficer, Operator, Manager)
 */
export const getPriorityDashboard = async (req, res, next) => {
  try {
    const stats = await incidentPriorityService.getPriorityDashboard();
    res.status(200).json({
      success: true,
      ...stats
    });
  } catch (error) {
    next(error);
  }
};
