import { Router } from 'express';
import { signup, login, getProfile } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', protect, getProfile);

export default router;
