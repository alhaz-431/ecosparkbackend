
import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

const getString = (value: any): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? String(value[0]) : String(value);
};

export const createIdea = async (req: AuthRequest, res: Response) => {
  try {
    const { title, problemStatement, solution, description, images, type, price, categoryId } = req.body;
    if (!title || !problemStatement || !solution || !description || !categoryId) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const idea = await prisma.idea.create({
      data: {
        title, problemStatement, solution, description,
        images: Array.isArray(images) ? images : images ? [images] : [],
        type: type || 'FREE',
        price: type === 'PAID' ? Number(price) : null,
        authorId: req.user!.id,
        categoryId,
      },
    });
    res.status(201).json({ message: 'Idea created successfully', idea });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


export const getAllIdeas = async (req: Request, res: Response) => {
  try {
    const category = getString(req.query.category);
    const type = getString(req.query.type);
    const search = getString(req.query.search);
    const sort = getString(req.query.sort);
    const page = parseInt(getString(req.query.page) || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    // শুরুতে সব স্ট্যাটাস দেখার জন্য status ফিল্টারটি কমেন্ট করে দেখতে পারেন
    const where: any = { status: 'APPROVED' };
    
    if (category) where.categoryId = category;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = sort === 'top' ? { votes: { _count: 'desc' } } : { createdAt: 'desc' };

    const [ideas, total] = await Promise.all([
      prisma.idea.findMany({
        where, 
        orderBy, 
        skip, 
        take: limit,
        include: {
          author: { select: { id: true, name: true } },
          category: true,
          votes: true,
        },
      }),
      prisma.idea.count({ where }),
    ]);

    res.json({ ideas, pagination: { total, page, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    // এটি আপনাকে বলবে আসলে প্রিজমা কেন রিড করতে পারছে না
    console.error("GET_ALL_IDEAS_ERROR:", error); 
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};


export const getIdeaById = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        category: true,
        votes: true,
      },
    });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.type === 'PAID' && req.user) {
      const payment = await prisma.payment.findFirst({
        where: { ideaId: id, userId: String(req.user.id) },
      });
      if (!payment && idea.authorId !== String(req.user.id)) {
        return res.status(403).json({ message: 'Purchase required to view this idea' });
      }
    }
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateIdea = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.authorId !== String(req.user!.id)) return res.status(403).json({ message: 'Forbidden' });
    if (idea.status !== 'DRAFT') return res.status(400).json({ message: 'Only draft ideas can be edited' });
    const { images, price, type, ...rest } = req.body;
    const updated = await prisma.idea.update({
      where: { id },
      data: {
        ...rest,
        images: images ? (Array.isArray(images) ? images : [images]) : idea.images,
        price: type === 'PAID' ? Number(price) : null,
        type: type || idea.type,
      },
    });
    res.json({ message: 'Idea updated', idea: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteIdea = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.authorId !== String(req.user!.id)) return res.status(403).json({ message: 'Forbidden' });
    if (idea.status !== 'DRAFT') return res.status(400).json({ message: 'Only draft ideas can be deleted' });
    await prisma.idea.delete({ where: { id } });
    res.json({ message: 'Idea deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const submitIdea = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.authorId !== String(req.user!.id)) return res.status(403).json({ message: 'Forbidden' });
    if (idea.status !== 'DRAFT') return res.status(400).json({ message: 'Only draft ideas can be submitted' });
    const updated = await prisma.idea.update({
      where: { id },
      data: { status: 'UNDER_REVIEW' },
    });
    res.json({ message: 'Idea submitted for review', idea: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


export const getMyIdeas = async (req: AuthRequest, res: Response) => {
  try {
    const ideas = await prisma.idea.findMany({
      where: { authorId: String(req.user!.id) },
      include: {
        category: true,
        votes: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getIdeaBasicInfo = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const idea = await prisma.idea.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: true,
        price: true,
        category: true,
        author: { select: { id: true, name: true } },
      },
    });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};