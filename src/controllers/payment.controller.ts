import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

// Stripe initialization
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

/**
 * ১. পেমেন্ট ইন্টেন্ট তৈরি করা (সংশোধিত)
 */
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    // আইডিটি বডি অথবা প্যারামস থেকে নেওয়া (নিরাপত্তার জন্য দুইটাই চেক করছি)
    const ideaId = req.params.id || req.body.ideaId;
    const userId = req.user?.id;

    if (!ideaId || ideaId === 'undefined') {
      return res.status(400).json({ message: 'সঠিক আইডিয়া আইডি প্রয়োজন' });
    }
    if (!userId) {
      return res.status(401).json({ message: 'দয়া করে লগইন করুন' });
    }

    const idea = await prisma.idea.findUnique({ 
      where: { id: String(ideaId) } 
    });

    if (!idea) {
      return res.status(404).json({ message: 'আইডিয়াটি খুঁজে পাওয়া যায়নি' });
    }

    if (idea.type !== 'PAID') {
      return res.status(400).json({ message: 'এটি একটি ফ্রি আইডিয়া, পেমেন্টের প্রয়োজন নেই' });
    }

    // আগের পেমেন্ট চেক
    const existingPayment = await prisma.payment.findFirst({
      where: { 
        ideaId: String(ideaId), 
        userId: String(userId),
        status: 'SUCCESS' 
      },
    });

    if (existingPayment) {
      return res.status(400).json({ message: 'আপনি এই আইডিয়াটি আগেই কিনেছেন' });
    }

    const price = idea.price || 0;
    const amount = Math.round(price * 100); 
    
    // Stripe Minimum Charge ফিক্স
    if (amount < 50) {
      return res.status(400).json({ 
        message: 'পেমেন্টের জন্য নুন্যতম ৬০ টাকা (বা ৫০ সেন্ট) দাম হতে হবে।' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd', 
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
    res.status(500).json({ message: 'পেমেন্ট শুরু করতে সমস্যা হয়েছে', details: error.message });
  }
};

/**
 * ২. পেমেন্ট কনফার্ম করা (সংশোধিত)
 */
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = req.params.id || req.body.ideaId;
    const userId = req.user?.id;
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'পেমেন্ট আইডি পাওয়া যায়নি' });
    }

    // স্ট্রাইপ থেকে তথ্য আনা
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'পেমেন্টটি এখনো সফল হয়নি' });
    }

    const idea = await prisma.idea.findUnique({ where: { id: String(ideaId) } });
    if (!idea) return res.status(404).json({ message: 'আইডিয়াটি পাওয়া যায়নি' });

    // ডাটাবেসে পেমেন্ট সেভ করা
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
      message: 'পেমেন্ট সফল হয়েছে এবং আইডিয়াটি আনলক হয়েছে!', 
      payment 
    });

  } catch (error: any) {
    console.error("Payment Confirmation Error:", error.message);
    res.status(500).json({ message: 'ভেরিফিকেশন ব্যর্থ হয়েছে', details: error.message });
  }
};