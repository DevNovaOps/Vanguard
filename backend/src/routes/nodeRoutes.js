import express from 'express';
import { body } from 'express-validator';
import {
  getAllNodes,
  getNodeById,
  createNode,
  updateNode,
  deleteNode
} from '../controllers/nodeController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const nodeValidationRules = [
  body('nodeCode')
    .trim()
    .notEmpty()
    .withMessage('Node code is required')
    .toUpperCase(),
  body('nodeName')
    .trim()
    .notEmpty()
    .withMessage('Node name is required'),
  body('nodeType')
    .trim()
    .isIn(['Station', 'Junction', 'Depot', 'PowerHub', 'SignalTower'])
    .withMessage('Node type must be Station, Junction, Depot, PowerHub, or SignalTower'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid float between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid float between -180 and 180'),
  body('region')
    .trim()
    .notEmpty()
    .withMessage('Region is required'),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Maintenance', 'healthy', 'warning', 'critical', 'maintenance'])
    .withMessage('Invalid status value')
];

const nodeUpdateValidationRules = [
  body('nodeCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Node code cannot be empty')
    .toUpperCase(),
  body('nodeName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Node name cannot be empty'),
  body('nodeType')
    .optional()
    .trim()
    .isIn(['Station', 'Junction', 'Depot', 'PowerHub', 'SignalTower'])
    .withMessage('Node type must be Station, Junction, Depot, PowerHub, or SignalTower'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid float between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid float between -180 and 180'),
  body('region')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Region cannot be empty'),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Maintenance', 'healthy', 'warning', 'critical', 'maintenance'])
    .withMessage('Invalid status value')
];

// Read routes (Accessible to all authenticated users)
router.get('/', authenticateUser, getAllNodes);
router.get('/:id', authenticateUser, getNodeById);

// Write routes (Admin only)
router.post('/', authenticateUser, authorizeRoles('Admin'), nodeValidationRules, createNode);
router.put('/:id', authenticateUser, authorizeRoles('Admin'), nodeUpdateValidationRules, updateNode);
router.delete('/:id', authenticateUser, authorizeRoles('Admin'), deleteNode);

export default router;
