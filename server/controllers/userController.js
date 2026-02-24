import User from '../models/User.js';

export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { username, theme } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (username) {
            const existing = await User.findOne({ username, _id: { $ne: user._id } });
            if (existing) {
                return res.status(400).json({ message: 'Username already taken' });
            }
            user.username = username;
        }

        if (theme && ['light', 'dark'].includes(theme)) {
            user.theme = theme;
        }

        const updated = await user.save();
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
