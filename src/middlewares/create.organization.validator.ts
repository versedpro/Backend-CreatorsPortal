import { Validator } from './validator';
import { body, param, query } from 'express-validator';

export const createOrganizationValidator = () => {
  return Validator.validate([
    body('name')
      .exists()
      .isLength({ min: 3, max: 30 })
      .bail(),
    body('type', 'type is required')
      .exists()
      .isIn(['BRAND', 'COMMUNITY'])
      .bail(),
    body('website', 'Valid website url is required')
      .optional()
      .isURL()
      .bail(),
    body('twitter', 'Valid twitter url is required')
      .optional()
      .isURL()
      .bail(),
    body('discord', 'Valid discord url is required')
      .optional()
      .isURL()
      .bail(),
    body('admin_email', 'Valid admin_email is required')
      .optional()
      .isEmail()
      .bail(),
    param('admin_name')
      .optional()
      .isLength({ min: 3, max: 30 })
      .bail(),
    body('admin_wallet_address', 'Valid wallet address is required')
      .optional()
      .matches(new RegExp('(\\b0x[a-fA-F0-9]{40}\\b)'))
      .bail(),
  ]);
};

export const getOrganizationValidator = () => {
  return Validator.validate([
    query('name')
      .optional()
      .isLength({ min: 2, max: 30 })
      .bail(),
    query('type', 'type is required')
      .optional()
      .isIn(['BRAND', 'COMMUNITY'])
      .bail(),
    query('admin_email', 'Valid admin_email is required')
      .optional()
      .isEmail()
      .bail(),
    query('page')
      .optional()
      .isInt()
      .default(1)
      .bail(),
    query('size')
      .optional()
      .isInt()
      .default(30)
      .bail(),
  ]);
};
