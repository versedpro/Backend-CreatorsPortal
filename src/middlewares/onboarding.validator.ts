import { Validator } from './validator';
import { body, header } from 'express-validator';

export const signUpUserValidator = () => {
  return Validator.validate([
    body('email', 'email is required')
      .exists()
      .trim()
      .isEmail()
      .toLowerCase()
      .bail(),
    header('x-client-id', 'x-client-id is required')
      .exists()
      .isLength({ min: 25, max: 25 })
      .bail(),
    body('password', 'Password should be at least 8 characters and have at least one lowercase, uppercase, number, and symbol')
      .exists()
      .trim()
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
      .bail(),
    body('invite_code', 'Valid invite_code is required')
      .exists()
      .trim(),
    body('signature', 'signature is required if public_address is sent')
      .if(body('public_address').exists())
      .exists()
      .trim(),
    body('public_address', 'public_address is required if signature is sent')
      .if(body('signature').exists())
      .exists()
      .trim(),
  ]);
};

export const loginUserValidator = () => {
  return Validator.validate([
    body('email', 'email is required')
      .exists()
      .trim()
      .isEmail()
      .toLowerCase()
      .bail(),
    header('x-client-id', 'x-client-id is required')
      .exists()
      .isLength({ min: 25, max: 25 })
      .bail(),
    body('password', 'Password should be at least 8 characters and have at least one lowercase, uppercase, number, and symbol')
      .exists()
      .trim()
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
      .bail(),
  ]);
};

export const resetPasswordValidator = () => {
  return Validator.validate([
    body('email', 'email is required')
      .exists()
      .trim()
      .isEmail()
      .toLowerCase()
      .bail(),
    body('otp', 'otp is required')
      .exists()
      .trim()
      .bail(),
    body('password', 'Password should be at least 8 characters and have at least one lowercase, uppercase, number, and symbol')
      .exists()
      .trim()
      .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
      .bail(),
    header('x-client-id', 'x-client-id is required')
      .exists()
      .isLength({ min: 25, max: 25 })
      .bail(),
  ]);
};

export const forgotPasswordValidator = () => {
  return Validator.validate([
    body('email', 'email is required')
      .exists()
      .trim()
      .isEmail()
      .toLowerCase()
      .bail(),
    header('x-client-id', 'x-client-id is required')
      .exists()
      .isLength({ min: 25, max: 25 })
      .bail(),
  ]);
};
