import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middlewares/auth';
import { getIdeaBasicInfo } from '../controllers/idea.controller';
import {
  createIdea,
  getAllIdeas,
  getIdeaById,
  updateIdea,
  deleteIdea,
  submitIdea,
  getMyIdeas,
} from '../controllers/idea.controller';

const router = Router();

router.get('/', getAllIdeas);
router.get('/my', authenticate, getMyIdeas);
router.get('/:id', optionalAuthenticate, getIdeaById);
router.post('/', authenticate, createIdea);
router.put('/:id', authenticate, updateIdea);
router.delete('/:id', authenticate, deleteIdea);
router.patch('/:id/submit', authenticate, submitIdea);
router.get('/:id/basic', getIdeaBasicInfo);

export default router;