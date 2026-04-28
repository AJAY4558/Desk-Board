import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getProfile, updateProfile, uploadAvatar, deleteAvatar } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure avatars directory exists
const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// Multer config for avatars
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
    }
});

const avatarFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (JPG, PNG, GIF, WebP)'), false);
    }
};

const uploadMiddleware = multer({
    storage: avatarStorage,
    fileFilter: avatarFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// Routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, uploadMiddleware.single('avatar'), uploadAvatar);
router.delete('/avatar', protect, deleteAvatar);

export default router;
