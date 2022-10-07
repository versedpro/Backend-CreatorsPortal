import { Validator } from './validator';
import { body, query } from 'express-validator';

export const createCollectionExpValidator = () => {
  return Validator.validate([
    body('chain')
      .exists()
      .trim()
      .bail(),
    body('collection_id')
      .optional()
      .isUUID()
      .trim()
      .bail(),
    body('name')
      .exists()
      .trim()
      .isLength({ min: 2, max: 30 })
      .bail(),
    body('quantity')
      .optional()
      .trim()
      .custom((value) => {
        if (isNaN(value)) {
          return false;
        }
        const num = Number(value);
        return Number.isInteger(num);
      })
      .bail(),
    body('price')
      .optional()
      .trim()
      .bail(),
    body('royalties', 'royalties must be an integer between 1 and 100')
      .optional()
      .trim()
      .custom((value) => {
        if (isNaN(value)) {
          return false;
        }
        const num = Number(value);
        if (!Number.isInteger(num)) {
          return false;
        }
        return (num >= 1) && (num <= 100);
      })
      .bail(),
    body('royalty_address')
      .optional()
      .trim()
      .matches(new RegExp('(\\b0x[a-fA-F0-9]{40}\\b)'))
      .bail(),
    body('collection_name')
      .exists()
      .trim()
      .isLength({ min: 2, max: 30 })
      .bail(),
    body('collection_description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .bail(),
    body('collection_about')
      .optional()
      .trim()
      .isLength({ min: 10, max: 1000 })
      .bail(),
    body('agree_to_terms')
      .optional()
      .trim()
      .default('false')
      .bail(),
    body('understand_irreversible_action')
      .optional()
      .trim()
      .default('false')
      .bail(),
    body('track_ip_addresses')
      .optional()
      .trim()
      .default('false')
      .bail(),
    body('create_contract')
      .optional()
      .trim()
      .default('false')
      .bail(),
  ]);
};

export const getCollectionExpValidator = () => {
  return Validator.validate([
    query('name')
      .optional()
      .isLength({ min: 2, max: 30 })
      .bail(),
    query('status', 'valid status is required')
      .optional()
      .isIn(['DRAFT', 'DEPLOYMENT_IN_PROGRESS', 'DEPLOYMENT_FAILED', 'DEPLOYED'])
      .bail(),
    query('oldest_date', 'Valid oldest_date is required')
      .optional()
      .isInt()
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
