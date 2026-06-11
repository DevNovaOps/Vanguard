import express from 'express';
import {
  createWebhookController,
  getWebhooksController,
  getWebhookByIdController,
  updateWebhookController,
  deleteWebhookController,
  testWebhookController,
  activateWebhookController,
  deactivateWebhookController,
  getWebhookStatsController,
  getWebhookDeliveriesController,
  retryFailedDeliveryController
} from '../controllers/webhookController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Apply auth middleware globally to webhook endpoints
router.use(authenticateUser);

// Statistics and delivery logs endpoints
router.get(
  '/stats',
  authorizeRoles('Admin', 'SafetyOfficer', 'Manager', 'Operator'),
  getWebhookStatsController
);

router.get(
  '/deliveries',
  authorizeRoles('Admin', 'SafetyOfficer', 'Manager', 'Operator'),
  getWebhookDeliveriesController
);

router.post(
  '/deliveries/:deliveryId/retry',
  authorizeRoles('Admin'),
  retryFailedDeliveryController
);

// Webhook CRUD & Trigger Management
router.get(
  '/',
  authorizeRoles('Admin', 'SafetyOfficer', 'Manager', 'Operator'),
  getWebhooksController
);

router.get(
  '/:id',
  authorizeRoles('Admin', 'SafetyOfficer', 'Manager', 'Operator'),
  getWebhookByIdController
);

router.post(
  '/',
  authorizeRoles('Admin'),
  createWebhookController
);

router.patch(
  '/:id',
  authorizeRoles('Admin'),
  updateWebhookController
);

router.delete(
  '/:id',
  authorizeRoles('Admin'),
  deleteWebhookController
);

router.post(
  '/:id/test',
  authorizeRoles('Admin'),
  testWebhookController
);

router.post(
  '/:id/activate',
  authorizeRoles('Admin'),
  activateWebhookController
);

router.post(
  '/:id/deactivate',
  authorizeRoles('Admin'),
  deactivateWebhookController
);

export default router;
