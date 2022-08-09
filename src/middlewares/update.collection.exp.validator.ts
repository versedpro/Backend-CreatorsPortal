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
      .optional({ nullable: true })
      .trim()
      .isURL()
      .bail(),
    body('checkout_background_color')
      .optional()
      .trim()
      .isHexColor()
      .bail(),
    body('checkout_font')
      .optional()
      .trim()
      .bail(),
    body('checkout_font_size')
      .optional()
      .trim()
      .isInt({ min: 1 })
      .bail(),
    body('checkout_font_color')
      .optional()
      .trim()
      .isHexColor()
      .bail(),
    body('terms_and_condition_enabled')
      .optional()
      .trim()
      .isBoolean({ loose: true })
      .bail(),
    body('terms_and_condition_link')
      .optional({ nullable: true })
      .trim()
      .isURL()
      .bail(),
  ]);
};
