import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import Video from '../models/Video';
import Detection from '../models/Detection';
import Camera from '../models/Camera';

/**
 * Compiles surveillance metadata statistics and connection settings.
 */
export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const totalVideos = await Video.countDocuments({});
    const totalDetections = await Detection.countDocuments({});
    
    // Count unique active camera nodes
    const activeCameras = await Camera.countDocuments({});
    
    // Count items in the processing stages
    const pendingProcessing = await Video.countDocuments({ 
      status: { $in: ['pending', 'uploading', 'extracting', 'analyzing'] } 
    });

    const statusCounts = await Video.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusObj = {
      pending: 0,
      uploading: 0,
      extracting: 0,
      analyzing: 0,
      completed: 0,
      failed: 0,
    };

    statusCounts.forEach(item => {
      if (item._id in statusObj) {
        statusObj[item._id as keyof typeof statusObj] = item.count;
      }
    });

    // Check system environment setups
    const systemConfig = {
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      s3Configured: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET_NAME),
      mapsConfigured: !!process.env.GOOGLE_MAPS_API_KEY,
    };

    res.status(200).json({
      totalVideos,
      totalDetections,
      activeCameras,
      pendingProcessing,
      statusObj,
      systemConfig,
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to compile console statistics.' });
  }
}
