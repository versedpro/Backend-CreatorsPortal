import express from 'express';
import * as paymentController from '../controllers/payment.controller';
import bodyParser from 'body-parser';

const router = express.Router();
router.use(bodyParser.raw({ type: 'application/json' }));

router.post(
  '/stripe',
  paymentController.handleStripeWebhook,
);

export default router;
