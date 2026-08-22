import Joi from 'joi';

export const connectionSchema = Joi.object({
  sourceNode: Joi.string().required().messages({
    'string.empty': 'Source node reference must be provided'
  }),
  targetNode: Joi.string().required().messages({
    'string.empty': 'Target node reference must be provided'
  }),
  distance: Joi.number().min(0).required().messages({
    'number.min': 'Distance must be a non-negative number',
    'number.base': 'Distance must be a number'
  }),
  status: Joi.string().valid('Active', 'Inactive', 'Maintenance', 'active', 'warning', 'critical').optional().messages({
    'any.only': 'Invalid status value'
  })
});

export const updateConnectionSchema = Joi.object({
  sourceNode: Joi.string().optional(),
  targetNode: Joi.string().optional(),
  distance: Joi.number().min(0).optional().messages({
    'number.min': 'Distance must be a non-negative number',
    'number.base': 'Distance must be a number'
  }),
  status: Joi.string().valid('Active', 'Inactive', 'Maintenance', 'active', 'warning', 'critical').optional().messages({
    'any.only': 'Invalid status value'
  })
});
