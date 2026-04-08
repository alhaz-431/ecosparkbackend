import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

// Stripe initialization
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

/**
 * ১. পেমেন্ট ইন্টেন্ট তৈরি করা
 */
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user?.id;

    // প্রাথমিক ভ্যালিডেশন
    if (!ideaId || ideaId === 'undefined') {
      return res.status(400).json({ message: 'Valid Idea ID is required' });
    }
    if (!userId) {
      return res.status(401).json({ message: 'Please login to purchase' });
    }

    // ডাটাবেস থেকে আইডিয়া খুঁজে বের করা
    const idea = await prisma.idea.findUnique({ 
      where: { id: String(ideaId) } 
    });

    if (!idea) {
      return res.status(404).json({ message: 'Idea not found' });
    }

    // আইডিয়াটি পেইড কি না চেক করা
    if (idea.type !== 'PAID') {
      return res.status(400).json({ message: 'This is a free idea' });
    }

    // ইউজার কি অলরেডি কিনেছে?
    const existingPayment = await prisma.payment.findFirst({
      where: { 
        ideaId: String(ideaId), 
        userId: String(userId),
        status: 'SUCCESS' 
      },
    });

    if (existingPayment) {
      return res.status(400).json({ message: 'You have already purchased this idea' });
    }

    // এমাউন্ট ক্যালকুলেশন (Stripe এ পয়সা হিসেবে পাঠাতে হয়)
    const price = idea.price || 0;
    const amount = Math.round(price * 100); 
    
    // মিনিমাম এমাউন্ট চেক (Stripe minimum is 50 cents)
    if (amount < 50) {
      return res.status(400).json({ 
        message: 'The price is too low for online payment. Minimum 60 BDT required.' 
      });
    }

    // Stripe পেমেন্ট ইন্টেন্ট তৈরি
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd', // অথবা আপনার সাপোর্ট অনুযায়ী 'bdt'
      metadata: { 
        ideaId: String(ideaId), 
        userId: String(userId) 
      },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY 
    });

  } catch (error: any) {
    console.error("Stripe Intent Error:", error.message);
    res.status(500).json({ message: 'Failed to initialize payment', details: error.message });
  }
};

/**
 * ২. পেমেন্ট কনফার্ম করা এবং ডাটাবেসে সেভ করা
 */
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = req.params.id;
    const userId = req.user?.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment Intent ID is missing' });
    }

    // ১. স্ট্রাইপ থেকে পেমেন্ট স্ট্যাটাস রিট্রিভ করা
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment has not been completed successfully' });
    }

    // ২. আইডিয়াটির অস্তিত্ব চেক করা
    const idea = await prisma.idea.findUnique({ where: { id: String(ideaId) } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    // ৩. ডাটাবেসে পেমেন্ট রেকর্ড তৈরি করা (Transaction ব্যবহার করা ভালো)
    const payment = await prisma.payment.create({
      data: {
        userId: String(userId),
        ideaId: String(ideaId),
        amount: idea.price || 0,
        status: 'SUCCESS',
      },
    });

    res.json({ 
      success: true, 
      message: 'Payment verified and idea unlocked!', 
      payment 
    });

  } catch (error: any) {
    console.error("Payment Confirmation Error:", error.message);
    res.status(500).json({ message: 'Verification failed', details: error.message });
  }
};