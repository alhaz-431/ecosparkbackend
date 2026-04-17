import { Router } from 'express';
import { createPaymentIntent, confirmPayment } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// এখানে আইডি বের করে দিয়েছি যাতে ফ্রন্টএন্ডের ইউআরএল এর সাথে মিলে যায়
router.post('/create-intent', authenticate, createPaymentIntent);
router.post('/confirm-payment', authenticate, confirmPayment);

export default router;