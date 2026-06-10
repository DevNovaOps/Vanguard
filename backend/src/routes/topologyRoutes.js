import express from 'express';
import { getTopology } from '../controllers/topologyController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/topology', authenticateUser, getTopology);

export default router;
