import Room from '../models/Room.js';
import crypto from 'crypto';

const generateRoomId = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
};

export const createRoom = async (req, res) => {
    try {
        const { name } = req.body;
        let roomId;
        let exists = true;

        while (exists) {
            roomId = generateRoomId();
            exists = await Room.findOne({ roomId });
        }

        const room = await Room.create({
            roomId,
            name: name || 'Untitled DeskBoard',
            host: req.user._id,
            participants: [req.user._id]
        });

        const populated = await Room.findById(room._id)
            .populate('host', 'username email avatar')
            .populate('participants', 'username email avatar');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getRoom = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId })
            .populate('host', 'username email avatar')
            .populate('participants', 'username email avatar');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.json(room);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const joinRoom = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });

        if (!room) {
            return res.status(404).json({ message: 'Room not found. Please check the Room ID.' });
        }

        if (!room.participants.includes(req.user._id)) {
            room.participants.push(req.user._id);
            await room.save();
        }

        const populated = await Room.findById(room._id)
            .populate('host', 'username email avatar')
            .populate('participants', 'username email avatar');

        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserRooms = async (req, res) => {
    try {
        const rooms = await Room.find({
            $or: [
                { host: req.user._id },
                { participants: req.user._id }
            ]
        })
            .populate('host', 'username email avatar')
            .sort({ updatedAt: -1 })
            .limit(20);

        res.json(rooms);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const saveCanvas = async (req, res) => {
    try {
        const { canvasData } = req.body;
        const room = await Room.findOne({ roomId: req.params.roomId });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        room.canvasData = canvasData;
        await room.save();

        res.json({ message: 'Canvas saved successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const removeFromHistory = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: 'Room not found' });

        const userId = req.user._id.toString();
        const isHost = room.host.toString() === userId;

        if (isHost) {
            const others = room.participants.filter(p => p.toString() !== userId);
            if (others.length === 0) {
                // Only member — delete the room entirely
                await Room.deleteOne({ _id: room._id });
                return res.json({ message: 'Room deleted' });
            }
            // Transfer host to the next participant, remove self
            room.host = others[0];
            room.participants = others;
        } else {
            // Just a participant — remove from list
            room.participants = room.participants.filter(p => p.toString() !== userId);
        }

        await room.save();
        res.json({ message: 'Removed from history' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
