import Joi from 'joi';

export const incidentSchema = Joi.object({
  nodeId: Joi.string().required().messages({
    'string.empty': 'Node ID must be provided'
  }),
  riskScore: Joi.number().min(0).max(100).required().messages({
    'number.min': 'Risk score must be a number between 0 and 100',
    'number.max': 'Risk score must be a number between 0 and 100',
    'number.base': 'Risk score must be a number'
  }),
  title: Joi.string().trim().required().messages({
    'string.empty': 'Incident title is required'
  }),
  description: Joi.string().trim().required().messages({
    'string.empty': 'Incident description is required'
  }),
  source: Joi.string().trim().valid('Telemetry', 'Compliance', 'Simulation', 'Manual', 'Agent').required().messages({
    'any.only': 'Source must be Telemetry, Compliance, Simulation, Manual, or Agent'
  }),
  status: Joi.string().valid('Open', 'Investigating', 'Mitigating', 'Resolved', 'Closed').optional().messages({
    'any.only': 'Status must be Open, Investigating, Mitigating, Resolved, or Closed'
  }),
  assignedTeam: Joi.string().trim().allow(null, '').optional()
});

export const updateIncidentSchema = Joi.object({
  nodeId: Joi.string().optional(),
  riskScore: Joi.number().min(0).max(100).optional().messages({
    'number.min': 'Risk score must be a number between 0 and 100',
    'number.max': 'Risk score must be a number between 0 and 100',
    'number.base': 'Risk score must be a number'
  }),
  title: Joi.string().trim().optional(),
  description: Joi.string().trim().optional(),
  source: Joi.string().trim().valid('Telemetry', 'Compliance', 'Simulation', 'Manual', 'Agent').optional().messages({
    'any.only': 'Source must be Telemetry, Compliance, Simulation, Manual, or Agent'
  }),
  status: Joi.string().valid('Open', 'Investigating', 'Mitigating', 'Resolved', 'Closed').optional().messages({
    'any.only': 'Status must be Open, Investigating, Mitigating, Resolved, or Closed'
  })
});
