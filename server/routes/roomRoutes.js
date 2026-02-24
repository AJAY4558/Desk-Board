import express from 'express';
import { createRoom, getRoom, joinRoom, getUserRooms, saveCanvas } from '../controllers/roomController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createRoom);
router.get('/user/my-rooms', protect, getUserRooms);
router.get('/:roomId', protect, getRoom);
router.post('/:roomId/join', protect, joinRoom);
router.put('/:roomId/canvas', protect, saveCanvas);

export default router;
