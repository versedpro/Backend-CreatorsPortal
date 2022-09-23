import express from 'express';
import * as paymentController from '../controllers/payment.controller';

const router = express.Router();

router.post(
  '/stripe',
  // express.raw({ type: 'application/json' }),
  paymentController.handleStripeWebhook,
);

export default router;
