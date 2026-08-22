import express from 'express';
import {
  getAllConnections,
  getConnectionById,
  createConnection,
  updateConnection,
  deleteConnection
} from '../controllers/connectionController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import validateRequest from '../middleware/validateMiddleware.js';
import { connectionSchema, updateConnectionSchema } from '../validators/connectionValidator.js';

const router = express.Router();

// Read routes (Accessible to all authenticated users)
router.get('/', authenticateUser, getAllConnections);
router.get('/:id', authenticateUser, getConnectionById);

// Write routes (Admin only)
router.post('/', authenticateUser, authorizeRoles('Admin'), validateRequest(connectionSchema), createConnection);
router.put('/:id', authenticateUser, authorizeRoles('Admin'), validateRequest(updateConnectionSchema), updateConnection);
router.delete('/:id', authenticateUser, authorizeRoles('Admin'), deleteConnection);

export default router;
