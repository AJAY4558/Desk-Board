import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { username, theme } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        if (username) {
            const existing = await User.findOne({ username, _id: { $ne: user._id } });
            if (existing) return res.status(400).json({ message: 'Username already taken' });
            user.username = username;
        }

        if (theme && ['light', 'dark'].includes(theme)) user.theme = theme;

        const updated = await user.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ── Avatar Upload ────────────────────────── */
export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Delete old avatar file from disk if it exists
        if (user.avatar) {
            const oldFilePath = path.join(__dirname, '..', user.avatar);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        user.avatar = `/uploads/avatars/${req.file.filename}`;
        const updated = await user.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ── Avatar Delete ────────────────────────── */
export const deleteAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.avatar) {
            const filePath = path.join(__dirname, '..', user.avatar);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            user.avatar = '';
            await user.save();
        }

        res.json({ message: 'Avatar removed successfully', avatar: '' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
