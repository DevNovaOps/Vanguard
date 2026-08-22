import Joi from 'joi';

export const ruleSchema = Joi.object({
  ruleCode: Joi.string().trim().uppercase().required().messages({
    'string.empty': 'Rule code is required'
  }),
  standard: Joi.string().trim().required().messages({
    'string.empty': 'Standard compliance field is required'
  }),
  sensorType: Joi.string().trim().valid(
    'Temperature', 'Vibration', 'Pressure', 'Gas', 'Humidity', 'Smoke', 'Voltage', 'Current'
  ).required().messages({
    'any.only': 'Sensor type must be one of: Temperature, Vibration, Pressure, Gas, Humidity, Smoke, Voltage, Current'
  }),
  minValue: Joi.number().allow(null).optional().messages({
    'number.base': 'Minimum value must be a valid number'
  }),
  maxValue: Joi.number().allow(null).optional().messages({
    'number.base': 'Maximum value must be a valid number'
  }),
  severity: Joi.string().trim().valid('Low', 'Medium', 'High', 'Critical').required().messages({
    'any.only': 'Severity must be Low, Medium, High, or Critical'
  }),
  description: Joi.string().trim().optional()
});

export const updateRuleSchema = Joi.object({
  ruleCode: Joi.string().trim().uppercase().optional(),
  standard: Joi.string().trim().optional(),
  sensorType: Joi.string().trim().valid(
    'Temperature', 'Vibration', 'Pressure', 'Gas', 'Humidity', 'Smoke', 'Voltage', 'Current'
  ).optional().messages({
    'any.only': 'Sensor type must be one of: Temperature, Vibration, Pressure, Gas, Humidity, Smoke, Voltage, Current'
  }),
  minValue: Joi.number().allow(null).optional().messages({
    'number.base': 'Minimum value must be a valid number'
  }),
  maxValue: Joi.number().allow(null).optional().messages({
    'number.base': 'Maximum value must be a valid number'
  }),
  severity: Joi.string().trim().valid('Low', 'Medium', 'High', 'Critical').optional().messages({
    'any.only': 'Severity must be Low, Medium, High, or Critical'
  }),
  description: Joi.string().trim().optional()
});
