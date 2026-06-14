import express from 'express';
import {
  getRoutes,
  getTopology,
  getCorridors,
  getNodeConnections
} from '../controllers/routeController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/routes', authenticateUser, getRoutes);
router.get('/topology', authenticateUser, getTopology);
router.get('/corridors', authenticateUser, getCorridors);
router.get('/nodes/:id/connections', authenticateUser, getNodeConnections);

export default router;
