import Joi from 'joi';

export const nodeSchema = Joi.object({
  nodeCode: Joi.string().trim().uppercase().required().messages({
    'string.empty': 'Node code is required'
  }),
  nodeName: Joi.string().trim().required().messages({
    'string.empty': 'Node name is required'
  }),
  nodeType: Joi.string().trim().valid('Station', 'Junction', 'Depot', 'PowerHub', 'SignalTower').required().messages({
    'any.only': 'Node type must be Station, Junction, Depot, PowerHub, or SignalTower',
    'string.empty': 'Node type is required'
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'Latitude must be a valid float between -90 and 90',
    'number.max': 'Latitude must be a valid float between -90 and 90',
    'number.base': 'Latitude must be a number'
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'Longitude must be a valid float between -180 and 180',
    'number.max': 'Longitude must be a valid float between -180 and 180',
    'number.base': 'Longitude must be a number'
  }),
  region: Joi.string().trim().required().messages({
    'string.empty': 'Region is required'
  }),
  status: Joi.string().valid('Active', 'Inactive', 'Maintenance', 'healthy', 'warning', 'critical', 'maintenance').optional().messages({
    'any.only': 'Invalid status value'
  })
});

export const updateNodeSchema = Joi.object({
  nodeCode: Joi.string().trim().uppercase().optional(),
  nodeName: Joi.string().trim().optional(),
  nodeType: Joi.string().trim().valid('Station', 'Junction', 'Depot', 'PowerHub', 'SignalTower').optional().messages({
    'any.only': 'Node type must be Station, Junction, Depot, PowerHub, or SignalTower'
  }),
  latitude: Joi.number().min(-90).max(90).optional().messages({
    'number.min': 'Latitude must be a valid float between -90 and 90',
    'number.max': 'Latitude must be a valid float between -90 and 90',
    'number.base': 'Latitude must be a number'
  }),
  longitude: Joi.number().min(-180).max(180).optional().messages({
    'number.min': 'Longitude must be a valid float between -180 and 180',
    'number.max': 'Longitude must be a valid float between -180 and 180',
    'number.base': 'Longitude must be a number'
  }),
  region: Joi.string().trim().optional(),
  status: Joi.string().valid('Active', 'Inactive', 'Maintenance', 'healthy', 'warning', 'critical', 'maintenance').optional().messages({
    'any.only': 'Invalid status value'
  })
});
