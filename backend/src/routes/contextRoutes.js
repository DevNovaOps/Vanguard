import express from 'express';
import {
  listContexts,
  getContext,
  createContext,
  updateContext,
  archiveContext,
  restoreContext,
  duplicateContext,
  saveSnapshot,
  loadSnapshot
} from '../controllers/contextController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All context routes require authentication
router.use(protect);

router.get('/', listContexts);
router.get('/:id', getContext);
router.post('/', createContext);
router.put('/:id', updateContext);
router.delete('/:id', archiveContext);
router.post('/:id/restore', restoreContext);
router.post('/:id/duplicate', duplicateContext);
router.put('/:id/snapshot', saveSnapshot);
router.get('/:id/snapshot', loadSnapshot);

export default router;
