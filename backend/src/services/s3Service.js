import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  // When running on EC2/EBS with IAM role, credentials are automatically provided
  // For local development, you can use environment variables
  ...(process.env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }),
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'fourdoor-ai-uploads';

// Allowed file types and size limits
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: ['application/pdf', 'text/csv', 'text/plain', 'application/json'],
  media: ['video/mp4', 'audio/mpeg', 'audio/wav'],
};

const MAX_FILE_SIZES = {
  images: 10 * 1024 * 1024, // 10MB
  documents: 25 * 1024 * 1024, // 25MB
  media: 100 * 1024 * 1024, // 100MB
};

/**
 * Get the category of a file based on its MIME type
 */
function getFileCategory(mimeType) {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(mimeType)) {
      return category;
    }
  }
  return null;
}

/**
 * Validate file before upload
 */
export function validateFile(file) {
  const category = getFileCategory(file.mimetype);
  
  if (!category) {
    return {
      valid: false,
      error: `File type '${file.mimetype}' is not allowed`,
    };
  }
  
  const maxSize = MAX_FILE_SIZES[category];
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)`,
    };
  }
  
  return { valid: true, category };
}

/**
 * Generate a unique key for S3 storage
 */
function generateS3Key(userId, category, originalFilename) {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const uuid = uuidv4();
  return `${category}/${userId}/${timestamp}-${uuid}${ext}`;
}

/**
 * Upload a file to S3
 */
export async function uploadFile(file, userId, options = {}) {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const key = options.key || generateS3Key(userId, validation.category, file.originalname);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: {
      userId,
      originalName: file.originalname,
      uploadedAt: new Date().toISOString(),
      ...(options.metadata || {}),
    },
  });
  
  await s3Client.send(command);
  
  return {
    key,
    bucket: BUCKET_NAME,
    url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
    category: validation.category,
  };
}

/**
 * Get a presigned URL for uploading (client-side uploads)
 */
export async function getUploadPresignedUrl(userId, filename, contentType, expiresIn = 3600) {
  const file = { mimetype: contentType, size: 0, originalname: filename };
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const key = generateS3Key(userId, validation.category, filename);
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    Metadata: {
      userId,
      originalName: filename,
      uploadedAt: new Date().toISOString(),
    },
  });
  
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  
  return {
    uploadUrl: signedUrl,
    key,
    bucket: BUCKET_NAME,
    expiresIn,
  };
}

/**
 * Get a presigned URL for downloading
 */
export async function getDownloadPresignedUrl(key, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  
  return {
    downloadUrl: signedUrl,
    expiresIn,
  };
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  await s3Client.send(command);
  return { deleted: true, key };
}

/**
 * List files for a user
 */
export async function listUserFiles(userId, options = {}) {
  const { prefix = '', maxKeys = 100, continuationToken } = options;
  
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix ? `${prefix}/${userId}/` : '',
    MaxKeys: maxKeys,
    ...(continuationToken && { ContinuationToken: continuationToken }),
  });
  
  const response = await s3Client.send(command);
  
  return {
    files: (response.Contents || []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${obj.Key}`,
    })),
    isTruncated: response.IsTruncated,
    nextContinuationToken: response.NextContinuationToken,
  };
}

/**
 * Check if a file exists
 */
export async function fileExists(key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (err) {
    if (err.name === 'NotFound') {
      return false;
    }
    throw err;
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(key) {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  
  const response = await s3Client.send(command);
  
  return {
    key,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    metadata: response.Metadata,
  };
}

export default {
  uploadFile,
  getUploadPresignedUrl,
  getDownloadPresignedUrl,
  deleteFile,
  listUserFiles,
  fileExists,
  getFileMetadata,
  validateFile,
};
