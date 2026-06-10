import express from 'express';
import { body } from 'express-validator';
import {
  getAllConnections,
  getConnectionById,
  createConnection,
  updateConnection,
  deleteConnection
} from '../controllers/connectionController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

const connectionValidationRules = [
  body('sourceNode')
    .isMongoId()
    .withMessage('Source node reference must be a valid Mongo ID'),
  body('targetNode')
    .isMongoId()
    .withMessage('Target node reference must be a valid Mongo ID'),
  body('distance')
    .isFloat({ min: 0 })
    .withMessage('Distance must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Maintenance', 'active', 'warning', 'critical'])
    .withMessage('Invalid status value')
];

const connectionUpdateValidationRules = [
  body('sourceNode')
    .optional()
    .isMongoId()
    .withMessage('Source node reference must be a valid Mongo ID'),
  body('targetNode')
    .optional()
    .isMongoId()
    .withMessage('Target node reference must be a valid Mongo ID'),
  body('distance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Distance must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Maintenance', 'active', 'warning', 'critical'])
    .withMessage('Invalid status value')
];

// Read routes (Accessible to all authenticated users)
router.get('/', authenticateUser, getAllConnections);
router.get('/:id', authenticateUser, getConnectionById);

// Write routes (Admin only)
router.post('/', authenticateUser, authorizeRoles('Admin'), connectionValidationRules, createConnection);
router.put('/:id', authenticateUser, authorizeRoles('Admin'), connectionUpdateValidationRules, updateConnection);
router.delete('/:id', authenticateUser, authorizeRoles('Admin'), deleteConnection);

export default router;
