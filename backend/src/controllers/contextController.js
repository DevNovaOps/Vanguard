import contextService from '../services/contextService.js';

export const listContexts = async (req, res, next) => {
  try {
    // Auto-seed defaults on first access
    await contextService.seedDefaultContexts(req.user._id);
    const contexts = await contextService.listContexts(req.user._id);
    res.json({ success: true, data: contexts });
  } catch (error) {
    next(error);
  }
};

export const getContext = async (req, res, next) => {
  try {
    const ctx = await contextService.getContext(req.params.id, req.user._id);
    if (!ctx) return res.status(404).json({ success: false, message: 'Context not found' });
    res.json({ success: true, data: ctx });
  } catch (error) {
    next(error);
  }
};

export const createContext = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;
    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({ success: false, message: 'Name must be 2-100 characters' });
    }
    const ctx = await contextService.createContext(req.user._id, { name, type, icon, color });
    res.status(201).json({ success: true, data: ctx });
  } catch (error) {
    next(error);
  }
};

export const updateContext = async (req, res, next) => {
  try {
    const ctx = await contextService.updateContext(req.params.id, req.user._id, req.body);
    res.json({ success: true, data: ctx });
  } catch (error) {
    next(error);
  }
};

export const archiveContext = async (req, res, next) => {
  try {
    await contextService.archiveContext(req.params.id, req.user._id);
    res.json({ success: true, message: 'Context archived' });
  } catch (error) {
    next(error);
  }
};

export const restoreContext = async (req, res, next) => {
  try {
    await contextService.restoreContext(req.params.id, req.user._id);
    res.json({ success: true, message: 'Context restored' });
  } catch (error) {
    next(error);
  }
};

export const duplicateContext = async (req, res, next) => {
  try {
    const { name } = req.body;
    const ctx = await contextService.duplicateContext(req.params.id, req.user._id, name);
    res.status(201).json({ success: true, data: ctx });
  } catch (error) {
    next(error);
  }
};

export const saveSnapshot = async (req, res, next) => {
  try {
    await contextService.saveSnapshot(req.params.id, req.user._id, req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const loadSnapshot = async (req, res, next) => {
  try {
    const data = await contextService.loadSnapshot(req.params.id, req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
