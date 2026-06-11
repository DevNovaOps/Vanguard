import webhookService from '../services/webhookService.js';

/**
 * @desc    Create Webhook subscription
 * @route   POST /api/webhooks
 * @access  Private (Admin)
 */
export const createWebhookController = async (req, res, next) => {
  try {
    const webhook = await webhookService.createWebhook(req.body, req);
    res.status(201).json({
      success: true,
      message: 'Webhook subscription created successfully',
      data: webhook
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    next(error);
  }
};

/**
 * @desc    Get configured webhooks
 * @route   GET /api/webhooks
 * @access  Private (Admin, SafetyOfficer, Manager, Operator)
 */
export const getWebhooksController = async (req, res, next) => {
  try {
    const webhooks = await webhookService.getWebhooks();
    res.status(200).json({
      success: true,
      message: 'Webhooks retrieved successfully',
      data: webhooks
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single webhook details by ID
 * @route   GET /api/webhooks/:id
 * @access  Private (Admin, SafetyOfficer, Manager, Operator)
 */
export const getWebhookByIdController = async (req, res, next) => {
  try {
    const webhook = await webhookService.getWebhookById(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Webhook details retrieved successfully',
      data: webhook
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    next(error);
  }
};

/**
 * @desc    Update a Webhook subscription
 * @route   PATCH /api/webhooks/:id
 * @access  Private (Admin)
 */
export const updateWebhookController = async (req, res, next) => {
  try {
    const webhook = await webhookService.updateWebhook(req.params.id, req.body, req);
    res.status(200).json({
      success: true,
      message: 'Webhook configuration updated successfully',
      data: webhook
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    next(error);
  }
};

/**
 * @desc    Delete a Webhook subscription
 * @route   DELETE /api/webhooks/:id
 * @access  Private (Admin)
 */
export const deleteWebhookController = async (req, res, next) => {
  try {
    const webhook = await webhookService.deleteWebhook(req.params.id, req);
    res.status(200).json({
      success: true,
      message: 'Webhook subscription deleted successfully',
      data: webhook
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    next(error);
  }
};

/**
 * @desc    Test Webhook triggering
 * @route   POST /api/webhooks/:id/test
 * @access  Private (Admin)
 */
export const testWebhookController = async (req, res, next) => {
  try {
    const deliveryLog = await webhookService.testWebhook(req.params.id, req);
    res.status(200).json({
      success: true,
      message: 'Webhook test executed',
      data: deliveryLog
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    next(error);
  }
};

/**
 * @desc    Activate Webhook
 * @route   POST /api/webhooks/:id/activate
 * @access  Private (Admin)
 */
export const activateWebhookController = async (req, res, next) => {
  try {
    const webhook = await webhookService.activateWebhook(req.params.id, req);
    res.status(200).json({
      success: true,
      message: 'Webhook subscription activated',
      data: webhook
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    next(error);
  }
};

/**
 * @desc    Deactivate Webhook
 * @route   POST /api/webhooks/:id/deactivate
 * @access  Private (Admin)
 */
export const deactivateWebhookController = async (req, res, next) => {
  try {
    const webhook = await webhookService.deactivateWebhook(req.params.id, req);
    res.status(200).json({
      success: true,
      message: 'Webhook subscription deactivated',
      data: webhook
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    next(error);
  }
};

/**
 * @desc    Get Webhook aggregate stats
 * @route   GET /api/webhooks/stats
 * @access  Private (Admin, SafetyOfficer, Manager, Operator)
 */
export const getWebhookStatsController = async (req, res, next) => {
  try {
    const stats = await webhookService.getWebhookStatistics();
    res.status(200).json({
      success: true,
      message: 'Webhook statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get webhook event delivery logs
 * @route   GET /api/webhooks/deliveries
 * @access  Private (Admin, SafetyOfficer, Manager, Operator)
 */
export const getWebhookDeliveriesController = async (req, res, next) => {
  try {
    const deliveries = await webhookService.getWebhookDeliveries(req.query);
    res.status(200).json({
      success: true,
      message: 'Webhook delivery logs retrieved successfully',
      data: deliveries
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retry a failed webhook delivery
 * @route   POST /api/webhooks/deliveries/:deliveryId/retry
 * @access  Private (Admin)
 */
export const retryFailedDeliveryController = async (req, res, next) => {
  try {
    const deliveryLog = await webhookService.retryFailedDelivery(req.params.deliveryId, req);
    res.status(200).json({
      success: true,
      message: 'Webhook delivery retry executed successfully',
      data: deliveryLog
    });
  } catch (error) {
    res.status(error.statusCode || 500);
    next(error);
  }
};

