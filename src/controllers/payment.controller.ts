import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    // ১. আইডি চেক করা (id যদি params এ না থাকে তবে body চেক করবে)
    const ideaId = req.params.id || req.body.ideaId;
    const userId = req.user?.id;

    if (!ideaId) return res.status(400).json({ message: 'Idea ID is required' });
    if (!userId) return res.status(401).json({ message: 'User not authenticated' });

    const idea = await prisma.idea.findUnique({ where: { id: String(ideaId) } });

    if (!idea) {
      console.log("Idea not found for ID:", ideaId);
      return res.status(404).json({ message: 'Idea not found' });
    }

    if (idea.type !== 'PAID') {
      return res.status(400).json({ message: 'This idea is free' });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { ideaId: String(ideaId), userId: String(userId) },
    });
    if (existingPayment) return res.status(400).json({ message: 'Already purchased' });

    // ২. কারেন্সি এবং এমাউন্ট চেক (বাংলাদেশ থেকে হলে 'usd' এর বদলে 'bdt' ট্রাই করতে পারেন যদি স্ট্রাইপ সাপোর্ট করে)
    const amount = Math.round((idea.price || 0) * 100);
    
    // এমাউন্ট কমপক্ষে ৫০ সেন্ট (বা সমপরিমাণ) হতে হয় স্ট্রাইপে
    if (amount < 50) return res.status(400).json({ message: 'Price is too low for Stripe' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd', // অথবা আপনার স্ট্রাইপ একাউন্ট অনুযায়ী 'bdt'
      metadata: { ideaId: String(ideaId), userId: String(userId) },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("Stripe API Error:", error.message); // এটি রেন্ডার লগে চেক করবেন
    res.status(400).json({ message: error.message }); // সরাসরি এরর মেসেজ পাঠানো যাতে সমস্যা বোঝা যায়
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