import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = String(req.params.id);
    const userId = String(req.user!.id);

    // ১. আপনার স্কিমা অনুযায়ী আইডিয়া খুঁজে বের করা
    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });

    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    // ২. আপনার স্কিমা অনুযায়ী enum IdeaType চেক (FREE vs PAID)
    if (idea.type !== 'PAID') {
      return res.status(400).json({ message: 'This idea is free' });
    }

    // ৩. ডাবল পেমেন্ট চেক করা
    const existingPayment = await prisma.payment.findFirst({
      where: { ideaId, userId },
    });
    if (existingPayment) return res.status(400).json({ message: 'Already purchased' });

    // ৪. পেমেন্ট ইন্টেন্ট তৈরি
    const amount = Math.round((idea.price || 0) * 100);
    if (amount <= 0) return res.status(400).json({ message: 'Invalid price' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      metadata: { ideaId, userId },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("Payment Error:", error.message);
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
      return res.status(400).json({ message: 'Payment not completed' });
    }

    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    // ৫. আপনার Payment মডেল অনুযায়ী ডাটা সেভ করা
    const payment = await prisma.payment.create({
      data: {
        userId,
        ideaId,
        amount: idea.price || 0,
        status: 'SUCCESS',
      },
    });

    res.json({ message: 'Payment successful', payment });
  } catch (error: any) {
    console.error("Confirmation Error:", error.message);
    res.status(500).json({ message: 'Payment confirmation error' });
  }
};