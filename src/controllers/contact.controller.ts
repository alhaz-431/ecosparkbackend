import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createContact = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'সব ঘর পূরণ করা আবশ্যক' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'সঠিক ইমেইল দিন' });
    }

    const contact = await prisma.contact.create({
      data: { name, email, subject, message }
    });

    return res.status(201).json({
      message: 'বার্তা সফলভাবে পাঠানো হয়েছে',
      data: contact
    });
  } catch (error: any) {
    console.error('Contact create error:', error);
    return res.status(500).json({ message: 'সার্ভার এরর, পরে আবার চেষ্টা করুন' });
  }
};

export const getContacts = async (req: Request, res: Response) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ data: contacts });
  } catch (error: any) {
    console.error('Contact fetch error:', error);
    return res.status(500).json({ message: 'সার্ভার এরর' });
  }
};