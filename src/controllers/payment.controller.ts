import { Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = String(req.params.id);
    const userId = String(req.user!.id);

    const idea = await prisma.idea.findUnique({ where: { id: ideaId } });

    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.type !== 'PAID') return res.status(400).json({ message: 'This idea is free' });

    // Check if already paid
    const existingPayment = await prisma.payment.findFirst({
      where: { ideaId, userId },
    });
    if (existingPayment) return res.status(400).json({ message: 'Already purchased' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round((idea.price || 0) * 100),
      currency: 'usd',
      metadata: { ideaId, userId },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Payment error' });
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

    const payment = await prisma.payment.create({
      data: {
        userId,
        ideaId,
        amount: idea.price || 0,
        status: 'SUCCESS',
      },
    });

    res.json({ message: 'Payment successful', payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Payment confirmation error' });
  }
};