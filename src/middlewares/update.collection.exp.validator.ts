import { Validator } from './validator';
import { body } from 'express-validator';

export const updateCollectionExpValidator = () => {
  return Validator.validate([
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10, max: 200 })
      .bail(),
    body('about')
      .optional()
      .trim()
      .isLength({ min: 20, max: 1000 })
      .bail(),
    body('track_ip_addresses')
      .optional()
      .trim()
      .default('false')
      .bail(),
    body('main_link')
      .optional()
      .trim()
      .isURL()
      .bail(),
    body('checkout_background_color')
      .optional()
      .trim()
      .isHexColor()
      .bail(),
  ]);
};
