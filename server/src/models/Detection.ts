import { Schema, model } from 'mongoose';

const DetectionSchema = new Schema(
  {
    videoId: {
      type: Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    cameraName: {
      type: String,
      required: true,
    },
    cameraId: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Number, // Seconds into the video
      required: true,
    },
    formattedTime: {
      type: String, // Clock time string
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    clothing: {
      shirt_type: { type: String, default: 'unknown' },
      shirt_color: { type: String, default: 'unknown' },
      pants_type: { type: String, default: 'unknown' },
      pants_color: { type: String, default: 'unknown' },
    },
    accessories: [{ type: String }],
    gender_estimate: {
      type: String,
      default: 'unknown',
    },
    description: {
      type: String,
      required: true,
    },
    tags: [{ type: String }],
    frameUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index text fields for semantic/keyword queries
DetectionSchema.index({
  description: 'text',
  tags: 'text',
  'clothing.shirt_color': 'text',
  'clothing.pants_color': 'text',
  'clothing.shirt_type': 'text',
  'clothing.pants_type': 'text',
});

export default model('Detection', DetectionSchema);
