import { Schema, model } from 'mongoose';

const CameraSchema = new Schema(
  {
    cameraId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sourceName: {
      type: String,
      required: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default model('Camera', CameraSchema);
