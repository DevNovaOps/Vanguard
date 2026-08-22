import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'string.empty': 'Name is required'
  }),
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.empty': 'Password is required'
  }),
  role: Joi.string().valid('Admin', 'Operator', 'SafetyOfficer', 'Manager').required().messages({
    'any.only': 'Role must be one of: Admin, Operator, SafetyOfficer, Manager',
    'string.empty': 'Role is required'
  }),
  department: Joi.string().trim().optional(),
  permissions: Joi.array().items(Joi.string()).optional().messages({
    'array.base': 'Permissions must be an array of strings'
  })
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().trim().optional().allow(''),
  email: Joi.string().trim().email().optional().allow('').messages({
    'string.email': 'Please enter a valid email address'
  }),
  department: Joi.string().trim().optional().allow('')
});
