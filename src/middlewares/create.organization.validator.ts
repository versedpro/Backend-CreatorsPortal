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
    body('password', 'Password should be at least 8 characters and have at least one lowercase, uppercase, number, and symbol')
      .exists()
      .trim()
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
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
