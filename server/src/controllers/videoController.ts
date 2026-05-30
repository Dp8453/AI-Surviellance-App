import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import Video from '../models/Video';
import Camera from '../models/Camera';
import Detection from '../models/Detection';
import { uploadFile } from '../services/s3Service';
import { extractVideoFrames, extractVideoThumbnail } from '../services/ffmpegService';
import { analyzeFrameFiles } from '../services/geminiService';
import path from 'path';
import fs from 'fs';

/**
 * Lists all surveillance videos.
 */
export async function getVideos(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const list = await Video.find({}).sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (error) {
    console.error('Fetch videos error:', error);
    res.status(500).json({ message: 'Failed to retrieve video records.' });
  }
}

/**
 * Deletes a surveillance video and all its associated detections.
 */
export async function deleteVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) {
      res.status(404).json({ message: 'Video record not found.' });
      return;
    }

    // Remove video and detections
    await Video.findByIdAndDelete(id);
    await Detection.deleteMany({ videoId: id });

    res.status(200).json({ message: 'Video and incident tags deleted successfully.' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ message: 'Failed to delete video record.' });
  }
}

/**
 * Receives multipart video files and executes background frame analysis.
 */
export async function uploadVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { 
      cameraName, 
      cameraId, 
      ipAddress, 
      latitude, 
      longitude, 
      recordingStartTime 
    } = req.body;

    if (!req.file) {
      res.status(400).json({ message: 'No video file uploaded.' });
      return;
    }

    if (!cameraName || !cameraId || !ipAddress || !latitude || !longitude || !recordingStartTime) {
      res.status(400).json({ message: 'All camera metadata fields are required.' });
      return;
    }

    const tempFilePath = req.file.path;
    const originalName = req.file.originalname;

    // Ensure camera node is registered
    let camera = await Camera.findOne({ cameraId });
    if (!camera) {
      await Camera.create({
        cameraId,
        sourceName: cameraName,
        ipAddress,
        location: {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
        },
      });
    }

    // 1. Save video record as 'pending'
    const newVideo = await Video.create({
      title: cameraName + ' - ' + originalName,
      fileUrl: '', // Will populate after S3 upload completion
      thumbnailUrl: '',
      cameraId,
      ipAddress,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      recordingStartTime: new Date(recordingStartTime),
      status: 'pending',
    });

    // Send immediate response back (202 Accepted) to client
    res.status(202).json({
      message: 'Surveillance feed uploaded. Background AI frame ingestion commenced.',
      video: newVideo,
    });

    // 2. Spawn background ingestion pipeline (non-blocking)
    processVideoBackground(newVideo._id.toString(), tempFilePath, originalName, cameraName, cameraId);

  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ message: 'Failed to ingest surveillance feed.' });
  }
}

/**
 * Asynchronous background worker representing the video pipeline.
 */
async function processVideoBackground(
  videoId: string,
  tempFilePath: string,
  originalName: string,
  cameraName: string,
  cameraId: string
): Promise<void> {
  let videoRecord = await Video.findById(videoId);
  if (!videoRecord) return;

  try {
    // Stage 1: Upload Video to AWS S3 (or Local storage)
    videoRecord.status = 'uploading';
    await videoRecord.save();

    const fileExtension = path.extname(originalName);
    const videoKey = `videos/${videoId}${fileExtension}`;
    const videoUrl = await uploadFile(tempFilePath, videoKey);

    videoRecord.fileUrl = videoUrl;
    await videoRecord.save();

    // Stage 2: Frame Extraction
    videoRecord.status = 'extracting';
    await videoRecord.save();

    const outputDir = path.join(__dirname, '..', '..', 'uploads', 'temp', videoId);
    const extractedFrames = await extractVideoFrames(tempFilePath, outputDir, 3);

    // Extract thumbnail
    const thumbFileName = `thumbnail.jpg`;
    const tempThumbPath = path.join(outputDir, thumbFileName);
    await extractVideoThumbnail(tempFilePath, tempThumbPath);
    
    // Upload thumbnail
    const thumbKey = `thumbnails/${videoId}.jpg`;
    const thumbnailUrl = await uploadFile(tempThumbPath, thumbKey);

    videoRecord.thumbnailUrl = thumbnailUrl;
    await videoRecord.save();

    // Stage 3: AI Analysis (Call Gemini API / Mock)
    videoRecord.status = 'analyzing';
    await videoRecord.save();

    const sceneDetections = await analyzeFrameFiles(
      extractedFrames, 
      videoRecord.title, 
      cameraName
    );

    // Stage 4: Index & Save Detections
    const uploadDetections = [];
    for (const det of sceneDetections) {
      // Upload frame picture to S3 / Local
      const frameKey = `frames/${videoId}-time-${det.timestamp}s.jpg`;
      const localFramePath = extractedFrames.find(f => f.timestamp === det.timestamp)?.filePath;
      
      let frameUrl = thumbnailUrl; // Fallback to thumbnail if frame missing
      if (localFramePath && fs.existsSync(localFramePath)) {
        frameUrl = await uploadFile(localFramePath, frameKey);
      }

      // Convert timestamp seconds to absolute time
      const absoluteTime = new Date(videoRecord.recordingStartTime.getTime() + det.timestamp * 1000)
        .toISOString()
        .slice(11, 19);

      uploadDetections.push({
        videoId: videoRecord._id,
        cameraName,
        cameraId,
        timestamp: det.timestamp,
        formattedTime: absoluteTime,
        confidence: det.confidence,
        location: {
          lat: videoRecord.latitude,
          lng: videoRecord.longitude,
        },
        clothing: det.clothing,
        accessories: det.accessories,
        gender_estimate: det.gender_estimate,
        description: det.description,
        tags: det.tags,
        frameUrl,
      });
    }

    // Insert detections to MongoDB
    if (uploadDetections.length > 0) {
      await Detection.insertMany(uploadDetections);
    }

    // Complete Pipeline
    videoRecord.status = 'completed';
    await videoRecord.save();

    // Clean up local temp folders
    cleanLocalTemp(tempFilePath, outputDir);

  } catch (err: any) {
    console.error(`Background ingestion pipeline failed for video ${videoId}:`, err);
    videoRecord.status = 'failed';
    videoRecord.errorMessage = err.message || 'Pipeline process error';
    await videoRecord.save();
    
    // Cleanup temp files on error
    try {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    } catch (_) {}
  }
}

/**
 * Utility to erase temporary video files and frames folder from local server storage.
 */
function cleanLocalTemp(tempFilePath: string, frameFolder: string): void {
  try {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (fs.existsSync(frameFolder)) {
      fs.rmSync(frameFolder, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Temporary directory cleanup failed:', err);
  }
}
