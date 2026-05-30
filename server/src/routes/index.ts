import { Router } from 'express';
import authRoutes from './authRoutes';
import videoRoutes from './videoRoutes';
import searchRoutes from './searchRoutes';
import mapRoutes from './mapRoutes';
import analyticsRoutes from './analyticsRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/videos', videoRoutes);
router.use('/search', searchRoutes);
router.use('/map', mapRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
