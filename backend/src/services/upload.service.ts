import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function saveFile(file: Express.Multer.File): string {
  ensureUploadDir();
  
  const fileName = `${Date.now()}-${sanitizeFileName(file.originalname)}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  
  fs.writeFileSync(filePath, file.buffer);
  
  return `/uploads/${fileName}`;
}

export function deleteFile(filePath: string): boolean {
  if (!filePath.startsWith('/uploads/')) {
    return false;
  }
  
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    return true;
  }
  
  return false;
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getAllowedMimeTypes(): string[] {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
}

export function getMaxFileSize(): number {
  return 5 * 1024 * 1024; // 5MB
}
