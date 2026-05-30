import { Schema, model } from 'mongoose';

const VideoSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: '',
    },
    cameraId: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
    recordingStartTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'uploading', 'extracting', 'analyzing', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default model('Video', VideoSchema);
