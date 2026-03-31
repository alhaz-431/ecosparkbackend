import { Router } from 'express';
import { createPaymentIntent, confirmPayment } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/:id/payment-intent', authenticate, createPaymentIntent);
router.post('/:id/confirm-payment', authenticate, confirmPayment);

export default router;