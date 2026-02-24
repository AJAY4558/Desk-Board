import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userAPI } from '../services/api';
import { ArrowLeft, User, Mail, Moon, Sun, Save, Loader } from 'lucide-react';
import './Profile.css';

const Profile = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (user) setUsername(user.username);
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        try {
            await userAPI.updateProfile({ username, theme });
            setMessage('Profile updated!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-page">
            <div className="auth-bg-orbs">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
            </div>

            <div className="profile-container animate-scale-in">
                <button className="btn btn-secondary back-btn" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="profile-header">
                    <div className="profile-avatar">
                        <span>{user?.username?.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <h1 className="profile-title">Profile</h1>
                    <p className="profile-email">
                        <Mail size={14} /> {user?.email}
                    </p>
                </div>

                {message && (
                    <div className={`toast-inline ${message.includes('updated') ? 'toast-success' : 'toast-error'}`}>
                        {message}
                    </div>
                )}

                <div className="profile-form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="input-field input-with-icon"
                                minLength={3}
                                maxLength={30}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Theme Preference</label>
                        <div className="theme-toggle-row">
                            <button
                                className={`theme-option ${theme === 'light' ? 'selected' : ''}`}
                                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                            >
                                <Sun size={18} /> Light
                            </button>
                            <button
                                className={`theme-option ${theme === 'dark' ? 'selected' : ''}`}
                                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                            >
                                <Moon size={18} /> Dark
                            </button>
                        </div>
                    </div>

                    <button className="btn btn-primary profile-save" onClick={handleSave} disabled={loading}>
                        {loading ? <Loader size={16} className="spin" /> : <Save size={16} />}
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
