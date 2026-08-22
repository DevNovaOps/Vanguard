import commandCenterService from '../services/commandCenterService.js';

export const getExecutiveSummary = async (req, res, next) => {
  try {
    const summary = await commandCenterService.getExecutiveSummary(req.contextId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const getDigitalTwin = async (req, res, next) => {
  try {
    const twin = await commandCenterService.getDigitalTwin(req.contextId);
    res.json({ success: true, data: twin });
  } catch (error) {
    next(error);
  }
};

export const getPredictiveMaintenance = async (req, res, next) => {
  try {
    const data = await commandCenterService.getPredictiveMaintenance(req.contextId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const askAiAgent = async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }
    const result = await commandCenterService.askAiAgent(query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getWorkOrders = async (req, res, next) => {
  try {
    const data = await commandCenterService.getWorkOrders(req.contextId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getMaintenanceCosts = async (req, res, next) => {
  try {
    const data = await commandCenterService.getMaintenanceCosts();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTrainHealth = async (req, res, next) => {
  try {
    const data = await commandCenterService.getTrainHealth();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
