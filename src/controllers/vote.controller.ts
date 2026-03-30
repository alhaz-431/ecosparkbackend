import { Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

export const voteIdea = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = String(req.params.id);
    const { value } = req.body;
    const userId = String(req.user!.id);

    if (![1, -1].includes(value)) {
      return res.status(400).json({ message: 'Vote value must be 1 or -1' });
    }

    const existing = await prisma.vote.findUnique({
      where: { userId_ideaId: { userId, ideaId } },
    });

    if (existing) {
      if (existing.value === value) {
        await prisma.vote.delete({ where: { userId_ideaId: { userId, ideaId } } });
        return res.json({ message: 'Vote removed' });
      }
      const updated = await prisma.vote.update({
        where: { userId_ideaId: { userId, ideaId } },
        data: { value },
      });
      return res.json({ message: 'Vote updated', vote: updated });
    }

    const vote = await prisma.vote.create({ data: { userId, ideaId, value } });
    res.status(201).json({ message: 'Vote added', vote });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};