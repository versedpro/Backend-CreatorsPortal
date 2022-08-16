import { Validator } from './validator';
import { body } from 'express-validator';

export const updateUserValidator = () => {
  return Validator.validate([
    body('username', 'username is required')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .bail(),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
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
    body('facebook', 'Valid facebook url is required')
      .optional()
      .trim()
      .isURL()
      .bail(),
    body('instagram', 'Valid instagram url is required')
      .optional()
      .trim()
      .isURL()
      .bail(),
  ]);
};
