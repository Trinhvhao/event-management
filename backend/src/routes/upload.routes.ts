import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { uploadImage, uploadController } from '../controllers/upload.controller';

const router = Router();

/**
 * @route   POST /api/upload/image
 * @desc    Upload an image file
 * @access  Private (Organizer, Admin)
 */
router.post(
  '/image',
  authenticate,
  authorize('organizer', 'admin'),
  uploadImage,
  uploadController.uploadImage
);

export default router;
