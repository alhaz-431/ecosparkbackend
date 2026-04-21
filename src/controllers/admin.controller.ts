import { Request, Response } from 'express';
import prisma from '../prismaClient';

/**
 * ১. সকল আইডিয়া রিভিউ করার জন্য (Admin Only)
 */
export const getAllIdeasAdmin = async (req: Request, res: Response) => {
  try {
    const ideas = await prisma.idea.findMany({
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // ডাটা না থাকলেও যেন খালি অ্যারে পাঠায়
    res.json(ideas || []);
  } catch (error) {
    console.error('GetAllIdeas Error:', error);
    res.status(500).json({ message: 'Server error fetching ideas' });
  }
};

/**
 * ২. আইডিয়ার স্ট্যাটাস আপডেট (Approve/Reject)
 */
export const updateIdeaStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { status, feedbackNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updated = await prisma.idea.update({
      where: { id },
      data: { status, feedbackNote: feedbackNote || null },
    });

    res.json({ message: `Idea ${status.toLowerCase()}`, idea: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating idea status' });
  }
};

/**
 * ৩. সকল মেম্বার বা ইউজার দেখার কন্ট্রোলার
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        isActive: true, 
        createdAt: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

/**
 * ৪. ইউজার এক্টিভেট/ডিএক্টিভেট (Toggle User Status)
 */
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // এডমিন যেন নিজেকে ডিঅ্যাক্টিভেট করতে না পারে সেই চেক (Safety)
    if (user.role === 'ADMIN') {
        return res.status(403).json({ message: 'Cannot deactivate admin accounts' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    res.json({ 
      success: true,
      message: `User ${updated.isActive ? 'activated' : 'deactivated'}`, 
      user: updated 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error toggling user status' });
  }
};

/**
 * ৫. সেলস হিস্ট্রি বা পেমেন্ট লিস্ট
 */
export const getAllPurchases = async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        idea: {
          select: { title: true }
        },
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(payments || []);
  } catch (error) {
    console.error('Payment Fetch Error:', error);
    res.status(500).json({ message: 'Server error fetching payments' });
  }
};