import express from 'express';
import {
  getAllNodes,
  getNodeById,
  createNode,
  updateNode,
  deleteNode
} from '../controllers/nodeController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import validateRequest from '../middleware/validateMiddleware.js';
import { nodeSchema, updateNodeSchema } from '../validators/nodeValidator.js';

const router = express.Router();

// Read routes (Accessible to all authenticated users)
router.get('/', authenticateUser, getAllNodes);
router.get('/:id', authenticateUser, getNodeById);

// Write routes (Admin only)
router.post('/', authenticateUser, authorizeRoles('Admin'), validateRequest(nodeSchema), createNode);
router.put('/:id', authenticateUser, authorizeRoles('Admin'), validateRequest(updateNodeSchema), updateNode);
router.delete('/:id', authenticateUser, authorizeRoles('Admin'), deleteNode);

export default router;
