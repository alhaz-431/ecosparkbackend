import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
});

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = String(req.params.id);
    const userId = String(req.user!.id);

    // ১. আইডিয়াটি খুঁজে বের করা
    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });

    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    // ২. চেক করুন আইডিয়াটি পেইড কি না (নতুন স্কিমা অনুযায়ী isPaid)
    if (!idea.isPaid) {
      return res.status(400).json({ message: 'This idea is free, no payment needed' });
    }

    // ৩. আগে কেনা হয়েছে কি না চেক করুন
    const existingPayment = await prisma.payment.findFirst({
      where: { ideaId, userId },
    });
    if (existingPayment) return res.status(400).json({ message: 'You have already purchased this idea' });

    // ৪. স্ট্রাইপ পেমেন্ট ইন্টেন্ট তৈরি
    const amount = Math.round((idea.price || 0) * 100);
    if (amount <= 0) return res.status(400).json({ message: 'Invalid price amount' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      metadata: { ideaId, userId },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("PAYMENT_INTENT_ERROR:", error.message);
    res.status(500).json({ message: 'Payment error', details: error.message });
  }
};

export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = String(req.params.id);
    const userId = String(req.user!.id);
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment has not succeeded yet' });
    }

    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    // ৫. সাকসেস হলে ডাটাবেসে পেমেন্ট রেকর্ড করা
    const payment = await prisma.payment.create({
      data: {
        userId,
        ideaId,
        amount: idea.price || 0,
        status: 'SUCCESS',
      },
    });

    res.json({ message: 'Payment confirmed and saved', payment });
  } catch (error: any) {
    console.error("CONFIRM_PAYMENT_ERROR:", error.message);
    res.status(500).json({ message: 'Payment confirmation failed' });
  }
};