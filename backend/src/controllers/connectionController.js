import { validationResult } from 'express-validator';
import RailwayConnection from '../models/RailwayConnection.js';
import RailwayNode from '../models/RailwayNode.js';

/**
 * @desc    Get all railway connections
 * @route   GET /api/connections
 * @access  Private
 */
export const getAllConnections = async (req, res, next) => {
  try {
    const connections = await RailwayConnection.find({}).populate('sourceNode targetNode');
    res.status(200).json({
      success: true,
      count: connections.length,
      connections
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get details of a single connection by ID
 * @route   GET /api/connections/:id
 * @access  Private
 */
export const getConnectionById = async (req, res, next) => {
  try {
    const connection = await RailwayConnection.findById(req.params.id).populate('sourceNode targetNode');
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Railway Connection not found'
      });
    }
    res.status(200).json({
      success: true,
      connection
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new railway connection
 * @route   POST /api/connections
 * @access  Private/Admin
 */
export const createConnection = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  const { sourceNode, targetNode, distance, status } = req.body;

  try {
    if (sourceNode === targetNode) {
      return res.status(400).json({
        success: false,
        message: 'Source and target nodes must be different nodes'
      });
    }

    // Verify source node exists
    const sourceExists = await RailwayNode.findById(sourceNode);
    if (!sourceExists) {
      return res.status(404).json({
        success: false,
        message: `Source node with ID ${sourceNode} not found`
      });
    }

    // Verify target node exists
    const targetExists = await RailwayNode.findById(targetNode);
    if (!targetExists) {
      return res.status(404).json({
        success: false,
        message: `Target node with ID ${targetNode} not found`
      });
    }

    // Check if duplicate connection exists
    const connectionExists = await RailwayConnection.findOne({ sourceNode, targetNode });
    if (connectionExists) {
      return res.status(400).json({
        success: false,
        message: 'A connection between this source and target node already exists'
      });
    }

    const connection = await RailwayConnection.create({
      sourceNode,
      targetNode,
      distance,
      status
    });

    const populated = await RailwayConnection.findById(connection._id).populate('sourceNode targetNode');

    res.status(201).json({
      success: true,
      message: 'Railway Connection created successfully',
      connection: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a railway connection by ID
 * @route   PUT /api/connections/:id
 * @access  Private/Admin
 */
export const updateConnection = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array().map(err => err.msg).join(', ')
    });
  }

  const { sourceNode, targetNode } = req.body;

  try {
    // If updating nodes, perform validity checks
    if (sourceNode && targetNode && sourceNode === targetNode) {
      return res.status(400).json({
        success: false,
        message: 'Source and target nodes must be different nodes'
      });
    }

    if (sourceNode) {
      const sourceExists = await RailwayNode.findById(sourceNode);
      if (!sourceExists) {
        return res.status(404).json({
          success: false,
          message: `Source node with ID ${sourceNode} not found`
        });
      }
    }

    if (targetNode) {
      const targetExists = await RailwayNode.findById(targetNode);
      if (!targetExists) {
        return res.status(404).json({
          success: false,
          message: `Target node with ID ${targetNode} not found`
        });
      }
    }

    const connection = await RailwayConnection.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('sourceNode targetNode');

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Railway Connection not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Railway Connection updated successfully',
      connection
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a railway connection by ID
 * @route   DELETE /api/connections/:id
 * @access  Private/Admin
 */
export const deleteConnection = async (req, res, next) => {
  try {
    const connection = await RailwayConnection.findByIdAndDelete(req.params.id);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Railway Connection not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Railway Connection deleted successfully',
      deletedConnection: connection
    });
  } catch (error) {
    next(error);
  }
};
