import { Router } from 'express';
import { searchDetections } from '../controllers/searchController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/', protect, searchDetections);

export default router;
