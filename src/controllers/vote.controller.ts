import { Response } from 'express';
import prisma from '../prismaClient'; // আপনার প্রিজমা ক্লায়েন্ট পাথ অনুযায়ী ঠিক আছে
import { AuthRequest } from '../middlewares/auth';

export const voteIdea = async (req: AuthRequest, res: Response) => {
  try {
    const ideaId = String(req.params.id);
    const { value } = req.body; // value: 1 (Up) or -1 (Down)
    const userId = String(req.user!.id);

    // ১. ইনপুট ভ্যালিডেশন
    if (![1, -1].includes(value)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vote value must be 1 (Up) or -1 (Down)' 
      });
    }

    // ২. আগের ভোটের অবস্থা চেক করা
    const existing = await prisma.vote.findUnique({
      where: { userId_ideaId: { userId, ideaId } },
    });

    if (existing) {
      if (existing.value === value) {
        // একই বাটনে আবার ক্লিক করলে ভোট রিমুভ হবে
        await prisma.vote.delete({ 
          where: { userId_ideaId: { userId, ideaId } } 
        });
      } else {
        // অন্য বাটনে ক্লিক করলে ভোট আপডেট হবে
        await prisma.vote.update({
          where: { userId_ideaId: { userId, ideaId } },
          data: { value },
        });
      }
    } else {
      // নতুন ভোট দেওয়া
      await prisma.vote.create({ 
        data: { userId, ideaId, value } 
      });
    }

    // ৩. নতুন করে আপভোট ও ডাউনভোটের সংখ্যা ক্যালকুলেট করা (এটিই ফ্রন্টএন্ড আপডেট করবে)
    const [upvotes, downvotes] = await Promise.all([
      prisma.vote.count({ where: { ideaId, value: 1 } }),
      prisma.vote.count({ where: { ideaId, value: -1 } })
    ]);

    // ৪. বর্তমান ইউজারের লেটেস্ট ভোট স্ট্যাটাস চেক করা
    const finalVote = await prisma.vote.findUnique({
      where: { userId_ideaId: { userId, ideaId } }
    });

    // ৫. ফ্রন্টএন্ডের ডিমান্ড অনুযায়ী রেসপন্স পাঠানো
    return res.status(200).json({ 
      success: true, 
      message: 'Vote processed successfully',
      data: { 
        upvotes,
        downvotes,
        userVote: finalVote ? finalVote.value : 0 // ভোট না থাকলে ০
      }
    });

  } catch (error) {
    console.error("Voting error detail:", error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while processing vote' 
    });
  }
};