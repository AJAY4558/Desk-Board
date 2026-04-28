import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useTheme } from './ThemeContext';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { setTheme } = useTheme();

    // Sync the app theme to match the user's saved DB preference
    const applyUserTheme = (userData) => {
        if (userData?.theme) setTheme(userData.theme);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            authAPI.getMe()
                .then(userData => {
                    setUser(userData);
                    applyUserTheme(userData);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const register = async (userData) => {
        try {
            setError('');
            const data = await authAPI.register(userData);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            applyUserTheme(data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const login = async (credentials) => {
        try {
            setError('');
            const data = await authAPI.login(credentials);
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
            applyUserTheme(data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // Merge partial updates into the in-memory user and localStorage
    const updateUser = (partial) => {
        setUser(prev => {
            const updated = { ...prev, ...partial };
            localStorage.setItem('user', JSON.stringify(updated));
            // If theme changed, apply it immediately
            if (partial.theme) setTheme(partial.theme);
            return updated;
        });
    };

    const clearError = () => setError('');

    return (
        <AuthContext.Provider value={{ user, loading, error, register, login, logout, updateUser, clearError }}>
            {children}
        </AuthContext.Provider>
    );
};
