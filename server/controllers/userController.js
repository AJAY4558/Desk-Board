import User from '../models/User.js';

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

/* ── Avatar Upload (Base64 stored in MongoDB — no filesystem needed) ── */
export const uploadAvatar = async (req, res) => {
    try {
        const { avatar } = req.body; // base64 data URL string

        if (!avatar) return res.status(400).json({ message: 'No avatar data provided' });

        // Validate it's a base64 image data URL
        if (!avatar.startsWith('data:image/')) {
            return res.status(400).json({ message: 'Invalid image format' });
        }

        // Rough size check: base64 string length * 0.75 ≈ bytes
        const sizeBytes = (avatar.length * 3) / 4;
        if (sizeBytes > 2 * 1024 * 1024) { // 2 MB limit
            return res.status(400).json({ message: 'Image too large. Please use an image under 2 MB.' });
        }

        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.avatar = avatar;
        const updated = await user.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/* ── Avatar Delete ── */
export const deleteAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.avatar = '';
        await user.save();
        res.json({ message: 'Avatar removed successfully', avatar: '' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
