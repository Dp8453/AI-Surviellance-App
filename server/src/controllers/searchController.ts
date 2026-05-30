import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import Detection from '../models/Detection';

/**
 * Performs a natural language query across all ingested detections.
 */
export async function searchDetections(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      res.status(200).json([]);
      return;
    }

    const cleanQuery = query.trim().toLowerCase();
    
    // Split into keyword terms (removing punctuation)
    const keywords = cleanQuery
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 3); // Ignore short connecting words

    if (keywords.length === 0) {
      res.status(200).json([]);
      return;
    }

    // Build a flexible query matching:
    // 1. Tags array
    // 2. Text description
    // 3. Shirt/pants colors
    // 4. Accessories array
    // 5. Gender estimate
    const orConditions = keywords.map(word => {
      return {
        $or: [
          { tags: { $regex: word, $options: 'i' } },
          { description: { $regex: word, $options: 'i' } },
          { 'clothing.shirt_color': { $regex: `^${word}$`, $options: 'i' } },
          { 'clothing.pants_color': { $regex: `^${word}$`, $options: 'i' } },
          { 'clothing.shirt_type': { $regex: word, $options: 'i' } },
          { 'clothing.pants_type': { $regex: word, $options: 'i' } },
          { accessories: { $regex: word, $options: 'i' } },
          { gender_estimate: { $regex: `^${word}`, $options: 'i' } },
          { cameraName: { $regex: word, $options: 'i' } },
        ]
      };
    });

    const detections = await Detection.find({ $and: orConditions })
      .populate('videoId', 'title fileUrl status')
      .sort({ confidence: -1 });

    // Format output to match client requirements
    const results = detections.map(det => {
      // Calculate dynamic relevance score if multiple keywords match
      let scoreMultiplier = 1.0;
      let matchedCount = 0;
      
      const detText = `${det.description} ${det.tags.join(' ')} ${det.clothing?.shirt_color || ''} ${det.clothing?.pants_color || ''}`.toLowerCase();
      
      keywords.forEach(word => {
        if (detText.includes(word)) matchedCount++;
      });

      if (matchedCount > 1) {
        scoreMultiplier = 1.0 + (matchedCount * 0.05); // Boost score for multi-term matches
      }

      return {
        id: det._id,
        videoId: (det.videoId as any)?._id || det.videoId,
        videoTitle: (det.videoId as any)?.title || det.cameraName,
        videoUrl: (det.videoId as any)?.fileUrl || '',
        timestamp: det.timestamp,
        formattedTime: det.formattedTime,
        confidence: Math.round(Math.min(1.0, det.confidence * scoreMultiplier) * 100) / 100,
        cameraName: det.cameraName,
        cameraId: det.cameraId,
        location: det.location,
        clothing: det.clothing,
        accessories: det.accessories,
        gender_estimate: det.gender_estimate,
        description: det.description,
        tags: det.tags,
        frameUrl: det.frameUrl,
      };
    });

    // Sort by final confidence score
    res.status(200).json(results.sort((a, b) => b.confidence - a.confidence));

  } catch (error) {
    console.error('Search detections error:', error);
    res.status(500).json({ message: 'Failed to process natural language search.' });
  }
}
