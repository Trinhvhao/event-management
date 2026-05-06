import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { uploadImage, uploadController } from '../controllers/upload.controller';

const router = Router();

/**
 * @route   POST /api/upload/image
 * @desc    Upload an image file (event cover, etc.)
 * @access  Private (Organizer, Admin)
 */
router.post(
  '/image',
  authenticate,
  uploadImage,
  uploadController.uploadImage
);

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload user avatar image
 * @access  Private (All authenticated users)
 */
router.post(
  '/avatar',
  authenticate,
  uploadImage,
  uploadController.uploadAvatar
);

export default router;
