import Incident from '../models/Incident.js';

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
