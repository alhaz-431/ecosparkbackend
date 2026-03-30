import { Router } from 'express';
import { voteIdea } from '../controllers/vote.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/:id/vote', authenticate, voteIdea);

export default router;