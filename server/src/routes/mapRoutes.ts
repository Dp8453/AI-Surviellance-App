import { Router } from 'express';
import { getMapTrail } from '../controllers/mapController';
import { protect } from '../middleware/auth';

const router = Router();

router.get('/trail', protect, getMapTrail);
router.get('/config', protect, (req, res) => {
  res.status(200).json({ apiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
});

export default router;
