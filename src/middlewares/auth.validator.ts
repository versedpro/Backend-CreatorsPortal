import { Validator } from './validator';
import { body, param } from 'express-validator';
import { ADMIN_ADDRESSES } from '../constants';

export const authValidator = () => {
  return Validator.validate([
    param('user_type')
      .exists()
      .isIn(['admin', 'user'])
      .bail(),
    body('public_address', 'public_address is required')
      .exists()
      .bail(),
    body('public_address', 'An admin public_address is required')
      .toLowerCase()
      .isIn(ADMIN_ADDRESSES)
      .bail(),
    body('signature', 'signature is required')
      .exists()
      .bail(),
  ]);
};
