import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middlewares/auth';

// হেল্পার ফাংশন: কুয়েরি প্যারামস থেকে স্ট্রিং বের করার জন্য
const getString = (value: any): string | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? String(value[0]) : String(value);
};

// ১. নতুন আইডিয়া তৈরি করা
export const createIdea = async (req: AuthRequest, res: Response) => {
  try {
    const { title, problemStatement, solution, description, images, type, price, categoryId } = req.body;
    
    if (!title || !problemStatement || !solution || !description || !categoryId) {
      return res.status(400).json({ message: 'সবগুলো ঘর পূরণ করা বাধ্যতামূলক' });
    }

    const idea = await prisma.idea.create({
      data: {
        title,
        problemStatement,
        solution,
        description,
        images: Array.isArray(images) ? images : images ? [images] : [],
        type: type || 'FREE',
        price: type === 'PAID' ? Number(price) : 0,
        authorId: String(req.user!.id),
        categoryId,
      },
    });

    res.status(201).json({ message: 'আইডিয়াটি সফলভাবে তৈরি হয়েছে', idea });
  } catch (error) {
    console.error("CREATE_ERROR:", error);
    res.status(500).json({ message: 'সার্ভারে সমস্যা হয়েছে' });
  }
};

// ২. সব আইডিয়া দেখা (পেমেন্ট স্ট্যাটাসসহ ফিল্টারিং)
export const getAllIdeas = async (req: AuthRequest, res: Response) => {
  try {
    const category = getString(req.query.category);
    const type = getString(req.query.type);
    const search = getString(req.query.search);
    const sort = getString(req.query.sort);
    const status = getString(req.query.status);
    const page = parseInt(getString(req.query.page) || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const where: any = {}; 
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['APPROVED', 'DRAFT'] };
    }

    if (category) where.category = { name: category };
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
          payments: {
            where: { userId: req.user?.id ? String(req.user.id) : 'guest' }
          }
        },
      }),
      prisma.idea.count({ where }),
    ]);

    const formattedIdeas = ideas.map((idea: any) => ({
      ...idea,
      isPaid: idea.type === 'PAID',
      isPurchased: (idea.payments && idea.payments.length > 0)
    }));

    res.json({ 
      ideas: formattedIdeas, 
      pagination: { total, page, totalPages: Math.ceil(total / limit) } 
    });
  } catch (error: any) {
    res.status(500).json({ message: 'সার্ভার এরর', details: error.message });
  }
};

// ৩. সিঙ্গেল আইডিয়া ডিটেইলস (পেমেন্ট সিকিউরিটিসহ)
export const getIdeaById = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user ? String(req.user.id) : null;

    const idea = await prisma.idea.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true } },
        category: true,
        votes: true,
      },
    });

    if (!idea) return res.status(404).json({ message: 'আইডিয়াটি খুঁজে পাওয়া যায়নি' });

    const payment = await prisma.payment.findFirst({
      where: { ideaId: id, userId: userId || 'guest', status: 'SUCCESS' }
    });

    const isOwner = idea.authorId === userId;
    const hasAccess = idea.type === 'FREE' || isOwner || !!payment;

    res.json({
      ...idea,
      isPaid: idea.type === 'PAID',
      hasAccess: hasAccess,
      purchasedBy: payment ? [userId] : [] 
    });
  } catch (error) {
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
};

// ৪. আইডিয়া পারচেজ করা
export const purchaseIdea = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = String(req.user!.id);

    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    const existingPayment = await prisma.payment.findFirst({
      where: { ideaId: id, userId: userId, status: 'SUCCESS' }
    });

    if (existingPayment) {
      return res.status(200).json({ message: 'Already purchased', payment: existingPayment });
    }

    const payment = await prisma.payment.create({
      data: {
        ideaId: id,
        userId: userId,
        amount: idea.price || 0,
        status: 'SUCCESS', 
      }
    });

    res.status(201).json({ message: 'পেমেন্ট সফল হয়েছে', payment });
  } catch (error: any) {
    res.status(500).json({ message: 'পেমেন্ট ফেইল করেছে', details: error.message });
  }
};

// ৫. আইডিয়া আপডেট করা
export const updateIdea = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const idea = await prisma.idea.findUnique({ where: { id } });
    
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.authorId !== String(req.user!.id)) return res.status(403).json({ message: 'আপনি এই আইডিয়াটি এডিট করতে পারবেন না' });
    
    const { images, price, type, ...rest } = req.body;
    const updated = await prisma.idea.update({
      where: { id },
      data: {
        ...rest,
        images: images ? (Array.isArray(images) ? images : [images]) : idea.images,
        price: type === 'PAID' ? Number(price) : 0,
        type: type || idea.type,
      },
    });
    res.json({ message: 'আইডিয়া আপডেট হয়েছে', idea: updated });
  } catch (error) {
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
};

// ৬. আইডিয়া ডিলিট করা
export const deleteIdea = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const idea = await prisma.idea.findUnique({ where: { id } });
    
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.authorId !== String(req.user!.id)) return res.status(403).json({ message: 'Forbidden' });
    
    await prisma.idea.delete({ where: { id } });
    res.json({ message: 'আইডিয়াটি ডিলিট করা হয়েছে' });
  } catch (error) {
    res.status(500).json({ message: 'ডিলিট করতে সমস্যা হয়েছে' });
  }
};

// ৭. রিভিউ এর জন্য সাবমিট করা
export const submitIdea = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const idea = await prisma.idea.findUnique({ where: { id } });
    
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    if (idea.authorId !== String(req.user!.id)) return res.status(403).json({ message: 'Forbidden' });
    
    const updated = await prisma.idea.update({
      where: { id },
      data: { status: 'UNDER_REVIEW' },
    });
    res.json({ message: 'রিভিউর জন্য পাঠানো হয়েছে', idea: updated });
  } catch (error) {
    res.status(500).json({ message: 'সাবমিট ফেইল করেছে' });
  }
};

// ৮. নিজের আইডিয়াগুলো দেখা
export const getMyIdeas = async (req: AuthRequest, res: Response) => {
  try {
    const ideas = await prisma.idea.findMany({
      where: { authorId: String(req.user!.id) },
      include: { category: true, votes: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
};

// ৯. কেনা আইডিয়াগুলো দেখা
export const getPurchasedIdeas = async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.user!.id);
    const purchases = await prisma.payment.findMany({
      where: { userId: userId, status: "SUCCESS" },
      include: {
        idea: {
          include: { 
            category: true, 
            author: { select: { id: true, name: true } } 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(purchases); 
  } catch (error: any) {
    res.status(500).json({ message: 'সার্ভার এরর', details: error.message });
  }
};

// ১০. বেসিক তথ্য দেখা (পেমেন্ট পেজের জন্য)
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
    res.status(500).json({ message: 'সার্ভার এরর' });
  }
};