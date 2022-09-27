import express from 'express';
import * as paymentController from '../controllers/payment.controller';

const router = express.Router();

router.get(
  '/cards',
  paymentController.handleGetCards
);

router.get(
  '/:collection_id/stripe-client-secret',
  paymentController.handleGetClientSecret
);

router.post(
  ':collection_id/charge-card',
  paymentController.handleChargeCard
);

export default router;
