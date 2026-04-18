import { Router } from 'express';
import { voteIdea } from '../controllers/vote.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// এই একটি রাউট দিয়েই আপভোট এবং ডাউনভোট হবে
router.post('/:id/vote', authenticate, voteIdea);

export default router;