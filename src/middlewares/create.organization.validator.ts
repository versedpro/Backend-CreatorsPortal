import { Validator } from './validator';
import { body, query } from 'express-validator';

export const createOrganizationValidator = () => {
  return Validator.validate([
    body('name')
      .exists()
      .trim()
      .isLength({ min: 3, max: 30 })
      .bail(),
    body('email', 'Valid email is required')
      .optional()
      .trim()
      .isEmail()
      .toLowerCase()
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
