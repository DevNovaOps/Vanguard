import routeService from '../services/routeService.js';

/**
 * @desc    Get all route segments
 * @route   GET /api/network/routes
 * @access  Private
 */
export const getRoutes = async (req, res, next) => {
  try {
    const routes = await routeService.getRoutes();
    res.status(200).json({
      success: true,
      count: routes.length,
      routes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get full network topology (nodes, routes, corridors, statistics)
 * @route   GET /api/network/topology
 * @access  Private
 */
export const getTopology = async (req, res, next) => {
  try {
    const topology = await routeService.getTopology();
    res.status(200).json({
      success: true,
      ...topology
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all corridors
 * @route   GET /api/network/corridors
 * @access  Private
 */
export const getCorridors = async (req, res, next) => {
  try {
    const corridors = await routeService.getCorridors();
    res.status(200).json({
      success: true,
      count: corridors.length,
      corridors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get connections incident to a specific node
 * @route   GET /api/network/nodes/:id/connections
 * @access  Private
 */
export const getNodeConnections = async (req, res, next) => {
  try {
    const connections = await routeService.getNodeConnections(req.params.id);
    res.status(200).json({
      success: true,
      count: connections.length,
      connections
    });
  } catch (error) {
    next(error);
  }
};
