import { Router } from 'express';
import { authenticate, optionalAuthenticate } from '../middlewares/auth';
import { 
  createIdea,
  getAllIdeas,
  getIdeaById,
  updateIdea,
  deleteIdea,
  submitIdea,
  getMyIdeas,
  getIdeaBasicInfo, 
  getPurchasedIdeas // এখানে এটি নিশ্চিত করুন
} from '../controllers/idea.controller';

const router = Router();

//--- গুরুত্বপূর্ণ: ডাইনামিক রাউটের (:id) আগে স্ট্যাটিক রাউটগুলো রাখতে হয় ---
router.get('/', getAllIdeas);
router.get('/my', authenticate, getMyIdeas);
router.get('/purchased', authenticate, getPurchasedIdeas); // এখানে 'authenticate' ব্যবহার করুন

router.get('/:id', optionalAuthenticate, getIdeaById);
router.post('/', authenticate, createIdea);
router.put('/:id', authenticate, updateIdea);
router.delete('/:id', authenticate, deleteIdea);
router.patch('/:id/submit', authenticate, submitIdea);
router.get('/:id/basic', getIdeaBasicInfo);

export default router;