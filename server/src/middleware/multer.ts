import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure temporary upload folder inside the server root
const tempUploadDir = path.join(__dirname, '..', '..', 'uploads', 'temp');

if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// Restrict uploads to videos and maximum 150MB
export const uploadVideoMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB Limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.mp4' && ext !== '.mov' && ext !== '.avi' && ext !== '.mkv') {
      return cb(new Error('Only video files (.mp4, .mov, .avi, .mkv) are allowed.'));
    }
    cb(null, true);
  },
});
