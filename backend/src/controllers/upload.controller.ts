import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { saveFile, getAllowedMimeTypes, getMaxFileSize } from '../services/upload.service';

// Multer configuration
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = getAllowedMimeTypes();

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: getMaxFileSize(),
  },
});

// CSV upload configuration
const csvStorage = multer.memoryStorage();

const csvFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'));
  }
};

const csvUpload = multer({
  storage: csvStorage,
  fileFilter: csvFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for CSV files
  },
});

// Middleware for single image upload
export const uploadImage = upload.single('image');

// Middleware for CSV file upload
export const uploadCSV = csvUpload.single('file');

export const uploadController = {
  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No image file provided',
          },
        });
        return;
      }

      const fileUrl = saveFile(req.file);

      res.status(201).json({
        success: true,
        data: {
          url: fileUrl,
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
        message: 'Image uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
