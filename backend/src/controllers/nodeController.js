import { validationResult } from 'express-validator';
import RailwayNode from '../models/RailwayNode.js';
import RailwayConnection from '../models/RailwayConnection.js';

/**
 * @desc    Get all railway nodes
 * @route   GET /api/nodes
 * @access  Private
 */
export const getAllNodes = async (req, res, next) => {
  try {
    const nodes = await RailwayNode.find({});
    res.status(200).json({
      success: true,
      count: nodes.length,
      nodes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details of a single railway node by ID
 * @route   GET /api/nodes/:id
 * @access  Private
 */
export const getNodeById = async (req, res, next) => {
  try {
    const node = await RailwayNode.findById(req.params.id);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Railway Node not found'
      });
    }
    res.status(200).json({
      success: true,
      node
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new railway node
 * @route   POST /api/nodes
 * @access  Private/Admin
 */
export const createNode = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  const { nodeCode, nodeName, nodeType, latitude, longitude, status, region } = req.body;

  try {
    const exists = await RailwayNode.findOne({ nodeCode: nodeCode.toUpperCase() });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `A railway node with code ${nodeCode.toUpperCase()} already exists`
      });
    }

    const node = await RailwayNode.create({
      nodeCode,
      nodeName,
      nodeType,
      latitude,
      longitude,
      status,
      region
    });

    res.status(201).json({
      success: true,
      message: 'Railway Node created successfully',
      node
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a railway node by ID
 * @route   PUT /api/nodes/:id
 * @access  Private/Admin
 */
export const updateNode = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  try {
    const node = await RailwayNode.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Railway Node not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Railway Node updated successfully',
      node
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a railway node by ID
 * @route   DELETE /api/nodes/:id
 * @access  Private/Admin
 */
export const deleteNode = async (req, res, next) => {
  try {
    const node = await RailwayNode.findByIdAndDelete(req.params.id);
    if (!node) {
      return res.status(404).json({
        success: false,
        message: 'Railway Node not found'
      });
    }

    // Cascade delete: delete all connections associated with the deleted node
    const connDeleteResult = await RailwayConnection.deleteMany({
      $or: [{ sourceNode: req.params.id }, { targetNode: req.params.id }]
    });

    res.status(200).json({
      success: true,
      message: 'Railway Node and its corresponding connections deleted successfully',
      deletedNode: node,
      cascadeConnectionsCount: connDeleteResult.deletedCount
    });
  } catch (error) {
    next(error);
  }
};
