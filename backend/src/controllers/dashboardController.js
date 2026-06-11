import Incident from '../models/Incident.js';
import auditService from '../services/auditService.js';
import webhookService from '../services/webhookService.js';

/**
 * @desc    Get dashboard incident statistics
 * @route   GET /api/dashboard/incidents
 * @access  Private
 */
export const getDashboardIncidents = async (req, res, next) => {
  try {
    const totalIncidents = await Incident.countDocuments({});
    
    // Open incidents are those with status Open, Investigating, or Mitigating
    const openIncidents = await Incident.countDocuments({ 
      status: { $in: ['Open', 'Investigating', 'Mitigating'] } 
    });
    
    // Critical incidents are those with severity Critical that are not Closed
    const criticalIncidents = await Incident.countDocuments({ 
      severity: 'Critical',
      status: { $ne: 'Closed' }
    });
    
    // Resolved incidents
    const resolvedIncidents = await Incident.countDocuments({ 
      status: 'Resolved' 
    });

    res.status(200).json({
      success: true,
      message: 'Dashboard incident statistics fetched successfully',
      data: {
        totalIncidents,
        openIncidents,
        criticalIncidents,
        resolvedIncidents
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard audit statistics
 * @route   GET /api/dashboard/audit
 * @access  Private
 */
export const getDashboardAudit = async (req, res, next) => {
  try {
    const stats = await auditService.getAuditStatistics();
    res.status(200).json({
      success: true,
      message: 'Dashboard audit statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get dashboard webhook statistics and webhooks list
 * @route   GET /api/dashboard/webhooks
 * @access  Private
 */
export const getDashboardWebhooks = async (req, res, next) => {
  try {
    const stats = await webhookService.getWebhookStatistics();
    const healthScore = webhookService.calculateHealthScore(stats.successRate, stats.averageLatency);
    const webhooks = await webhookService.getWebhooks();

    // Map webhooks to include properties that AdminDashboard.jsx expects
    const formattedWebhooks = webhooks.map(wh => {
      const doc = wh.toJSON ? wh.toJSON() : wh;
      return {
        ...doc,
        id: wh.webhookId,
        url: wh.endpoint,
        events: wh.subscribedEvents,
        avgLatency: wh.averageLatency,
        status: wh.status
      };
    });

    res.status(200).json({
      success: true,
      message: 'Dashboard webhook statistics retrieved successfully',
      data: {
        stats: {
          ...stats,
          healthScore
        },
        webhooks: formattedWebhooks
      }
    });
  } catch (error) {
    next(error);
  }
};

