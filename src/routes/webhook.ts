import express from 'express';
import * as paymentController from '../controllers/payment.controller';

const router = express.Router();

router.post(
  '/stripe',
  paymentController.handleStripeWebhook,
);

export default router;
