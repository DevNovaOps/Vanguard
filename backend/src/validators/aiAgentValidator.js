import Joi from 'joi';

export const evaluateSchema = Joi.object({
  temperature: Joi.number().required().messages({
    'number.base': 'Temperature must be a valid number',
    'any.required': 'Temperature is required'
  }),
  vibration: Joi.number().required().messages({
    'number.base': 'Vibration must be a valid number',
    'any.required': 'Vibration is required'
  }),
  gas: Joi.number().required().messages({
    'number.base': 'Gas must be a valid number',
    'any.required': 'Gas is required'
  }),
  power: Joi.number().required().messages({
    'number.base': 'Power voltage must be a valid number',
    'any.required': 'Power voltage is required'
  }),
  riskScore: Joi.number().required().messages({
    'number.base': 'Risk score must be a valid number',
    'any.required': 'Risk score is required'
  }),
  nodeId: Joi.string().required().messages({
    'string.empty': 'nodeId is required',
    'any.required': 'nodeId is required'
  })
});
