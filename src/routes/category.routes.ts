import { Router } from 'express';
import { createCategory, getAllCategories } from '../controllers/category.controller';
import { authenticate, authorizeAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getAllCategories);
router.post('/', authenticate, authorizeAdmin, createCategory);

export default router;