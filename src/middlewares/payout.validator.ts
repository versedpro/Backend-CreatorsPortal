import { Validator } from './validator';
import { body } from 'express-validator';

export const payoutValidator = () => {
  return Validator.validate([
    body('method', 'method is required')
      .exists()
      .trim()
      .bail(),
    body('recipient_address', 'Valid recipient_address is required')
      .if(body('recipient_account_id').not().exists())
      .exists()
      .trim(),
    body('recipient_account_id', 'Valid recipient_account_id is required')
      .if(body('recipient_address').not().exists())
      .exists()
      .trim(),
  ]);
};
