import { Validator } from './validator';
import { body } from 'express-validator';

export const mintAnswersValidator = () => {
  return Validator.validate([
    body('wallet_address')
      .exists()
      .trim()
      .bail(),
    body('answers', 'answers is required')
      .exists()
      .isArray()
      .bail(),
    body('answers.*.question_type', 'question_type is required')
      .exists()
      .isIn(['SHORT_TEXT', 'LONG_TEXT', 'EMAIL'])
      .bail(),
    body('answers.*.question', 'question is required')
      .exists()
      .bail(),
    body('answers.*.answer', 'answer is required')
      .exists()
      .bail(),
  ]);
};
