import Joi from 'joi';

export const mitigationSchema = Joi.object({
  incidentId: Joi.string().required().messages({
    'string.empty': 'Incident ID is required'
  }),
  nodeId: Joi.string().required().messages({
    'string.empty': 'Node ID is required'
  }),
  action: Joi.string().trim().valid(
    'Emergency Brake',
    'Emergency Speed Restriction',
    'Power Rerouting',
    'Route Isolation',
    'Infrastructure Shutdown',
    'Maintenance Dispatch',
    'Ventilation Activation',
    'Safety Escalation'
  ).required().messages({
    'any.only': 'Invalid action type specified'
  }),
  severity: Joi.string().trim().valid('Low', 'Medium', 'High', 'Critical').required().messages({
    'any.only': 'Severity must be Low, Medium, High, or Critical'
  }),
  executionNotes: Joi.string().trim().optional().allow('')
});

export const statusSchema = Joi.object({
  status: Joi.string().trim().valid('Pending', 'InProgress', 'Executed', 'Completed', 'Failed', 'Cancelled').required().messages({
    'any.only': 'Status must be Pending, InProgress, Executed, Completed, Failed, or Cancelled'
  }),
  executionNotes: Joi.string().trim().optional().allow('')
});

export const executeSchema = Joi.object({
  executionNotes: Joi.string().trim().optional().allow('')
});
