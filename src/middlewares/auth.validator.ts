import { Validator } from './validator';
import { body, header } from 'express-validator';
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

export const userAuthValidator = () => {
  return Validator.validate([
    body('public_address', 'public_address is required')
      .exists()
      .trim()
      .toLowerCase()
      .bail(),
    body('signature', 'signature is required')
      .exists()
      .trim()
      .bail(),
    header('x-client-id', 'x-client-id is required')
      .exists()
      .isLength({ min: 25, max: 25 })
      .bail(),
  ]);
};
