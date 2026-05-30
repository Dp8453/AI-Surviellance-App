import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Load variables
const s3Configured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_S3_BUCKET_NAME &&
  process.env.AWS_REGION
);

let s3Client: S3Client | null = null;
if (s3Configured) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

/**
 * Uploads a file to S3 or saves it locally if S3 is not configured.
 * @param filePath Path to the temporary file on local disk
 * @param key Target S3 key or target local path suffix (e.g. 'videos/video.mp4')
 * @returns The public URL of the uploaded asset
 */
export async function uploadFile(filePath: string, key: string): Promise<string> {
  const fileName = path.basename(key);
  const folderName = path.dirname(key); // e.g. 'videos', 'frames'

  if (s3Configured && s3Client) {
    try {
      const fileStream = fs.createReadStream(filePath);
      const bucket = process.env.AWS_S3_BUCKET_NAME || '';
      
      let contentType = 'application/octet-stream';
      if (key.endsWith('.mp4')) contentType = 'video/mp4';
      else if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (key.endsWith('.png')) contentType = 'image/png';

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileStream,
          ContentType: contentType,
        })
      );

      return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    } catch (err) {
      console.error('AWS S3 upload failed, falling back to local storage:', err);
    }
  }

  // Fallback: Save file to local uploads directory
  // We'll place the uploads in a folder named 'uploads' under the server root
  const uploadsBaseDir = path.join(__dirname, '..', '..', 'uploads');
  const targetDir = path.join(uploadsBaseDir, folderName);
  
  // Ensure target folder exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, fileName);
  
  // Copy file from temp path to target path if they are different
  if (filePath !== targetPath && fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, targetPath);
  }

  // Return a relative URL that our Express server will serve statically
  return `/uploads/${folderName}/${fileName}`;
}

/**
 * Uploads raw buffer data (e.g. extracted frames) to S3 or local files.
 */
export async function uploadBuffer(buffer: Buffer, key: string): Promise<string> {
  const fileName = path.basename(key);
  const folderName = path.dirname(key);

  if (s3Configured && s3Client) {
    try {
      const bucket = process.env.AWS_S3_BUCKET_NAME || '';
      
      let contentType = 'image/jpeg';
      if (key.endsWith('.png')) contentType = 'image/png';

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    } catch (err) {
      console.error('AWS S3 buffer upload failed, falling back to local storage:', err);
    }
  }

  // Fallback: Save buffer to local uploads directory
  const uploadsBaseDir = path.join(__dirname, '..', '..', 'uploads');
  const targetDir = path.join(uploadsBaseDir, folderName);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const targetPath = path.join(targetDir, fileName);
  fs.writeFileSync(targetPath, buffer);

  return `/uploads/${folderName}/${fileName}`;
}
