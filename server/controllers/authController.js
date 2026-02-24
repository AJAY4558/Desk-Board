import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            res.status(400);
            throw new Error('Please fill in all fields');
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
        if (!emailRegex.test(email)) {
            res.status(400);
            throw new Error('Please enter a valid email address');
        }

        if (password.length < 8) {
            res.status(400);
            throw new Error('Password must be at least 8 characters');
        }

        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
            res.status(400);
            throw new Error('Password must contain uppercase, lowercase, number, and special character');
        }

        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            res.status(400);
            throw new Error(userExists.email === email ? 'Email already registered' : 'Username already taken');
        }

        const user = await User.create({ username, email, password });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            theme: user.theme,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(res.statusCode === 200 ? 500 : res.statusCode).json({ message: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, username, identifier, password } = req.body;

        const loginId = identifier || email || username;
        if (!loginId || !password) {
            res.status(400);
            throw new Error('Please fill in all fields');
        }

        const isEmail = loginId.includes('@');
        const query = isEmail ? { email: loginId.toLowerCase() } : { username: loginId };
        const user = await User.findOne(query);

        if (!user) {
            res.status(401);
            throw new Error('Invalid credentials');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401);
            throw new Error('Invalid credentials');
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            theme: user.theme,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(res.statusCode === 200 ? 500 : res.statusCode).json({ message: error.message });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }
        res.json(user);
    } catch (error) {
        res.status(res.statusCode === 200 ? 500 : res.statusCode).json({ message: error.message });
    }
};

export const logout = async (req, res) => {
    res.json({ message: 'Logged out successfully' });
};
