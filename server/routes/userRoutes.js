import express from 'express';
import { getProfile, updateProfile, uploadAvatar, deleteAvatar } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/avatar', protect, uploadAvatar);      // accepts JSON { avatar: 'data:image/...' }
router.delete('/avatar', protect, deleteAvatar);

export default router;
