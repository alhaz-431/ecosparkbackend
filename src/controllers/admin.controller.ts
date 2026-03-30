import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const getAllIdeasAdmin = async (req: Request, res: Response) => {
  try {
    const ideas = await prisma.idea.findMany({
      include: {
        author: { select: { id: true, name: true, email: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

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
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    res.json({ message: `User ${updated.isActive ? 'activated' : 'deactivated'}`, user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


