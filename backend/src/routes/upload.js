import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import {
  uploadFile,
  getUploadPresignedUrl,
  getDownloadPresignedUrl,
  deleteFile,
  listUserFiles,
  getFileMetadata,
  validateFile,
} from '../services/s3Service.js';

const router = express.Router();

// Configure multer for memory storage (files stored in memory before S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (will be validated per category in s3Service)
    files: 10, // Max 10 files per request
  },
});

// Check if S3 is configured
const isS3Configured = () => {
  return !!(process.env.AWS_S3_BUCKET || process.env.AWS_REGION);
};

// Middleware to check S3 configuration
const requireS3 = (req, res, next) => {
  if (!isS3Configured()) {
    return res.status(503).json({
      error: 'File storage not configured',
      message: 'S3 storage is not available in the current environment',
    });
  }
  next();
};

/**
 * POST /api/upload
 * Upload a single file directly to S3
 */
router.post('/', authenticateToken, requireS3, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const result = await uploadFile(req.file, req.user.id, {
      metadata: {
        source: req.body.source || 'direct-upload',
        description: req.body.description || '',
      },
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      file: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/upload/multiple
 * Upload multiple files to S3
 */
router.post('/multiple', authenticateToken, requireS3, upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadPromises = req.files.map((file) =>
      uploadFile(file, req.user.id, {
        metadata: {
          source: req.body.source || 'batch-upload',
        },
      })
    );

    const results = await Promise.allSettled(uploadPromises);
    
    const successful = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);
    
    const failed = results
      .filter((r) => r.status === 'rejected')
      .map((r, i) => ({
        filename: req.files[i].originalname,
        error: r.reason.message,
      }));

    res.status(successful.length > 0 ? 201 : 400).json({
      message: `${successful.length} of ${req.files.length} files uploaded`,
      files: successful,
      errors: failed,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/upload/presigned
 * Get a presigned URL for client-side upload
 */
router.post('/presigned', authenticateToken, requireS3, async (req, res, next) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({
        error: 'Missing required fields: filename and contentType',
      });
    }

    const result = await getUploadPresignedUrl(
      req.user.id,
      filename,
      contentType,
      3600 // 1 hour expiry
    );

    res.json({
      message: 'Presigned URL generated',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/upload/download/:key(*)
 * Get a presigned URL for downloading a file
 */
router.get('/download/:key(*)', authenticateToken, requireS3, async (req, res, next) => {
  try {
    const { key } = req.params;
    
    // Verify user has access to this file (simple check - key should contain user ID)
    if (!key.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied to this file' });
    }

    const result = await getDownloadPresignedUrl(key, 3600);

    res.json({
      message: 'Download URL generated',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/upload/list
 * List files for the authenticated user
 */
router.get('/list', authenticateToken, requireS3, async (req, res, next) => {
  try {
    const { category, maxKeys, continuationToken } = req.query;

    const result = await listUserFiles(req.user.id, {
      prefix: category || '',
      maxKeys: parseInt(maxKeys) || 100,
      continuationToken,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/upload/metadata/:key(*)
 * Get metadata for a specific file
 */
router.get('/metadata/:key(*)', authenticateToken, requireS3, async (req, res, next) => {
  try {
    const { key } = req.params;

    // Verify user has access
    if (!key.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied to this file' });
    }

    const metadata = await getFileMetadata(key);
    res.json(metadata);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/upload/:key(*)
 * Delete a file from S3
 */
router.delete('/:key(*)', authenticateToken, requireS3, async (req, res, next) => {
  try {
    const { key } = req.params;

    // Verify user has access
    if (!key.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied to this file' });
    }

    await deleteFile(key);

    res.json({
      message: 'File deleted successfully',
      key,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/upload/validate
 * Validate a file before upload (useful for client-side validation)
 */
router.post('/validate', authenticateToken, async (req, res) => {
  const { filename, contentType, size } = req.body;

  if (!filename || !contentType || size === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: filename, contentType, and size',
    });
  }

  const validation = validateFile({
    originalname: filename,
    mimetype: contentType,
    size,
  });

  res.json({
    valid: validation.valid,
    ...(validation.error && { error: validation.error }),
    ...(validation.category && { category: validation.category }),
  });
});

export default router;
