import { Router } from 'express';
import {
  createIdea,
  getAllIdeas,
  getIdeaById,
  updateIdea,
  deleteIdea,
  submitIdea,
  getMyIdeas,
} from '../controllers/idea.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', getAllIdeas);
router.get('/my', authenticate, getMyIdeas);
router.get('/:id', getIdeaById);
router.post('/', authenticate, createIdea);
router.put('/:id', authenticate, updateIdea);
router.delete('/:id', authenticate, deleteIdea);
router.patch('/:id/submit', authenticate, submitIdea);

export default router;