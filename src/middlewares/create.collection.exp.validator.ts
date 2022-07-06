import { Validator } from './validator';
import { body, query } from 'express-validator';

export const createCollectionExpValidator = () => {
  return Validator.validate([
    body('chain')
      .exists()
      .bail(),
    body('collection_id')
      .optional()
      .isUUID()
      .bail(),
    body('name')
      .exists()
      .isLength({ min: 2, max: 30 })
      .bail(),
    body('quantity')
      .optional()
      .bail(),
    body('price')
      .optional()
      .bail(),
    body('royalties', 'royalties must be an integer between 1 and 100')
      .optional()
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
      .matches(new RegExp('(\\b0x[a-fA-F0-9]{40}\\b)'))
      .bail(),
    body('payout_address')
      .optional()
      .matches(new RegExp('(\\b0x[a-fA-F0-9]{40}\\b)'))
      .bail(),
    body('collection_name')
      .exists()
      .isLength({ min: 2, max: 30 })
      .bail(),
    body('collection_description')
      .optional()
      .isLength({ min: 10, max: 200 })
      .bail(),
    body('collection_about')
      .optional()
      .isLength({ min: 20, max: 1000 })
      .bail(),
    body('collection_about')
      .optional()
      .isLength({ min: 20, max: 1000 })
      .bail(),
    body('agree_to_terms')
      .optional()
      .default('false')
      .bail(),
    body('understand_irreversible_action')
      .optional()
      .default('false')
      .bail(),
    body('track_ip_addresses')
      .optional()
      .default('false')
      .bail(),
    body('create_contract')
      .optional()
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
      .isIn(['IN_PROGRESS', 'DEPLOYED'])
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
