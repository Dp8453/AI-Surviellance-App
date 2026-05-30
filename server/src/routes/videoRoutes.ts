import { Router } from 'express';
import { getVideos, uploadVideo, deleteVideo } from '../controllers/videoController';
import { protect } from '../middleware/auth';
import { uploadVideoMiddleware } from '../middleware/multer';

const router = Router();

// Protect all video routes under active JWT validation
router.get('/', protect, getVideos);
router.post('/upload', protect, uploadVideoMiddleware.single('video'), uploadVideo);
router.delete('/:id', protect, deleteVideo);

export default router;
