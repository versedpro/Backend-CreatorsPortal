import { Validator } from './validator';
import { body } from 'express-validator';
import { ADMIN_ADDRESSES } from '../constants';

export const authValidator = () => {
  return Validator.validate([
    body('public_address', 'public_address is required')
      .exists()
      .trim()
      .bail(),
    body('public_address', 'An admin public_address is required')
      .toLowerCase()
      .trim()
      .isIn(ADMIN_ADDRESSES)
      .bail(),
    body('signature', 'signature is required')
      .exists()
      .trim()
      .bail(),
  ]);
};
