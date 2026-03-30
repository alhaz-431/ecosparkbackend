import { Router } from 'express';
import { getAllIdeasAdmin, updateIdeaStatus, getAllUsers, toggleUserStatus } from '../controllers/admin.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate, authorizeAdmin);

router.get('/ideas', getAllIdeasAdmin);
router.patch('/ideas/:id/status', updateIdeaStatus);
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle', toggleUserStatus);

export default router;