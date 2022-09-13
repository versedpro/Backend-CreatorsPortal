import { Validator } from './validator';
import { body, param, query } from 'express-validator';

export const createOrganizationValidator = () => {
  return Validator.validate([
    body('name')
      .exists()
      .trim()
      .isLength({ min: 3, max: 30 })
      .bail(),
    body('type', 'type is required')
      .exists()
      .trim()
      .isIn(['BRAND', 'COMMUNITY'])
      .bail(),
    body('website', 'Valid website url is required')
      .optional()
      .trim()
      .isURL()
      .bail(),
    body('twitter', 'Valid twitter url is required')
      .optional()
      .trim()
      .isURL()
      .bail(),
    body('discord', 'Valid discord url is required')
      .optional()
      .trim()
      .isURL()
      .bail(),
    body('email', 'Valid email is required')
      .optional()
      .trim()
      .isEmail()
      .bail(),
    param('admin_name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .bail(),
    body('public_address', 'Valid wallet address is required')
      .optional()
      .trim()
      .matches(new RegExp('(\\b0x[a-fA-F0-9]{40}\\b)'))
      .bail(),
  ]);
};

export const getOrganizationValidator = () => {
  return Validator.validate([
    query('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 30 })
      .bail(),
    query('type', 'type is required')
      .optional()
      .trim()
      .isIn(['BRAND', 'COMMUNITY'])
      .bail(),
    query('email', 'Valid email is required')
      .optional()
      .trim()
      .isEmail()
      .bail(),
    query('page')
      .optional()
      .trim()
      .isInt()
      .default(1)
      .bail(),
    query('size')
      .optional()
      .trim()
      .isInt()
      .default(30)
      .bail(),
  ]);
};
