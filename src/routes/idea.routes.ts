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
  getPurchasedIdeas,
  purchaseIdea // ১. এখানে purchaseIdea ইম্পোর্ট করলাম
} from '../controllers/idea.controller';

const router = Router();

//--- গুরুত্বপূর্ণ: ডাইনামিক রাউটের (:id) আগে স্ট্যাটিক রাউটগুলো রাখতে হয় ---
router.get('/', getAllIdeas);
router.get('/my', authenticate, getMyIdeas);
router.get('/purchased', authenticate, getPurchasedIdeas);

// ২. পেমেন্ট করার রাস্তা (অবশ্যই ডাইনামিক আইডি'র আগে বা পরে সাবধানে বসাতে হয়)
// এখানে বসালে আপনার ফ্রন্টএন্ডের api.post(`/ideas/${id}/purchase`) কাজ করবে
router.post('/:id/purchase', authenticate, purchaseIdea); 

router.get('/:id', optionalAuthenticate, getIdeaById);
router.post('/', authenticate, createIdea);
router.put('/:id', authenticate, updateIdea);
router.delete('/:id', authenticate, deleteIdea);
router.patch('/:id/submit', authenticate, submitIdea);
router.get('/:id/basic', getIdeaBasicInfo);

export default router;