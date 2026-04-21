import { Router } from 'express';
import { 
  getAllIdeasAdmin, 
  updateIdeaStatus, 
  getAllUsers, 
  toggleUserStatus, 
  getAllPurchases // নিশ্চিত করুন এটি এখানে আছে
} from '../controllers/admin.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth';

const router = Router();

// সব অ্যাডমিন রাউটের জন্য প্রোটেকশন
router.use(authenticate, authorizeAdmin);

router.get('/ideas', getAllIdeasAdmin);
router.patch('/ideas/:id/status', updateIdeaStatus);
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle', toggleUserStatus);

// সেলস হিস্ট্রির জন্য এই রাউটটি যোগ করুন
router.get('/purchases', getAllPurchases); 

export default router;