import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import Detection from '../models/Detection';
import Video from '../models/Video';

/**
 * Compiles a chronological tracking path for a search query.
 * Waypoints are ordered by absolute date-time to represent a real suspect route.
 */
export async function getMapTrail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      res.status(200).json([]);
      return;
    }

    const cleanQuery = query.trim().toLowerCase();
    const keywords = cleanQuery
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    if (keywords.length === 0) {
      res.status(200).json([]);
      return;
    }

    const orConditions = keywords.map(word => {
      return {
        $or: [
          { tags: { $regex: word, $options: 'i' } },
          { description: { $regex: word, $options: 'i' } },
          { 'clothing.shirt_color': { $regex: `^${word}$`, $options: 'i' } },
          { 'clothing.pants_color': { $regex: `^${word}$`, $options: 'i' } },
          { accessories: { $regex: word, $options: 'i' } },
          { gender_estimate: { $regex: `^${word}`, $options: 'i' } },
        ]
      };
    });

    // Query detections, populate Video details to read recordingStartTime
    const detections = await Detection.find({ $and: orConditions })
      .populate({
        path: 'videoId',
        select: 'recordingStartTime title fileUrl'
      });

    // Calculate absolute timestamp for each detection to sort them
    const pathPoints = detections.map(det => {
      const videoStartTime = (det.videoId as any)?.recordingStartTime 
        ? new Date((det.videoId as any).recordingStartTime).getTime() 
        : Date.now();
      
      const absoluteTime = videoStartTime + (det.timestamp * 1000);

      return {
        id: det._id,
        cameraId: det.cameraId,
        cameraName: det.cameraName,
        timestamp: det.timestamp,
        formattedTime: det.formattedTime,
        location: det.location,
        frameUrl: det.frameUrl,
        description: det.description,
        videoTitle: (det.videoId as any)?.title || det.cameraName,
        videoUrl: (det.videoId as any)?.fileUrl || '',
        absoluteTime,
      };
    });

    // Sort chronologically (earliest first)
    const sortedTrail = pathPoints.sort((a, b) => a.absoluteTime - b.absoluteTime);

    res.status(200).json(sortedTrail);

  } catch (error) {
    console.error('Get map trail error:', error);
    res.status(500).json({ message: 'Failed to compile geolocation tracking trail.' });
  }
}
