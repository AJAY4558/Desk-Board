import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userAPI } from '../services/api';
import { ArrowLeft, User, Mail, Moon, Sun, Save, Loader, Camera, Trash2, Upload, X } from 'lucide-react';
import './Profile.css';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const fileInputRef = useRef();

    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Preview state for newly selected file (before upload)
    const [previewFile, setPreviewFile] = useState(null);   // File object
    const [previewUrl, setPreviewUrl] = useState(null);     // Object URL for <img>
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (user) setUsername(user.username);
    }, [user]);

    // Clean up object URL when component unmounts or preview changes
    useEffect(() => {
        return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
    }, [previewUrl]);

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3500);
    };

    /* ── Avatar helpers ── */
    const resolveAvatarSrc = () => {
        if (previewUrl) return previewUrl;
        if (user?.avatar) return user.avatar;
        return null;
    };

    const selectFile = (file) => {
        if (!file) return;
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
            showMessage('Only JPG, PNG, GIF or WebP images are allowed', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showMessage('Image must be under 5 MB', 'error');
            return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleFileChange = (e) => selectFile(e.target.files?.[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        selectFile(e.dataTransfer.files?.[0]);
    };

    const cancelPreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpload = async () => {
        if (!previewFile) return;
        setAvatarLoading(true);
        try {
            const updated = await userAPI.uploadAvatar(previewFile);
            updateUser({ avatar: updated.avatar });
            cancelPreview();
            showMessage('Profile photo updated!');
        } catch (err) {
            showMessage(err.message || 'Upload failed', 'error');
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        if (!window.confirm('Remove your profile photo?')) return;
        setAvatarLoading(true);
        try {
            await userAPI.deleteAvatar();
            updateUser({ avatar: '' });
            cancelPreview();
            showMessage('Profile photo removed');
        } catch (err) {
            showMessage(err.message || 'Delete failed', 'error');
        } finally {
            setAvatarLoading(false);
        }
    };

    /* ── Profile save ── */
    const handleSave = async () => {
        setLoading(true);
        try {
            const updated = await userAPI.updateProfile({ username, theme });
            updateUser({ username: updated.username, theme: updated.theme });
            showMessage('Profile updated!');
        } catch (err) {
            showMessage(err.message || 'Update failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const avatarSrc = resolveAvatarSrc();
    const initials = user?.username?.slice(0, 2).toUpperCase() || '??';

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

                {/* ── Avatar Section ── */}
                <div className="profile-header">
                    <div
                        className={`avatar-upload-zone ${isDragging ? 'dragging' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <div className="avatar-frame" onClick={() => fileInputRef.current?.click()}>
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="Avatar" className="avatar-img" />
                            ) : (
                                <div className="avatar-initials">{initials}</div>
                            )}
                            {/* Camera overlay */}
                            <div className="avatar-overlay">
                                {avatarLoading
                                    ? <Loader size={22} className="spin" />
                                    : <Camera size={22} />}
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="avatar-file-input"
                            onChange={handleFileChange}
                        />
                    </div>

                    <h1 className="profile-title">{user?.username}</h1>
                    <p className="profile-email">
                        <Mail size={14} /> {user?.email}
                    </p>

                    {/* Avatar action buttons */}
                    <div className="avatar-actions">
                        {previewFile ? (
                            <>
                                <button
                                    className="btn btn-primary btn-sm avatar-btn"
                                    onClick={handleUpload}
                                    disabled={avatarLoading}
                                >
                                    {avatarLoading ? <Loader size={14} className="spin" /> : <Upload size={14} />}
                                    Upload
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm avatar-btn"
                                    onClick={cancelPreview}
                                    disabled={avatarLoading}
                                >
                                    <X size={14} /> Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="btn btn-secondary btn-sm avatar-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={avatarLoading}
                                >
                                    <Camera size={14} />
                                    {user?.avatar ? 'Change Photo' : 'Add Photo'}
                                </button>
                                {user?.avatar && (
                                    <button
                                        className="btn btn-danger btn-sm avatar-btn"
                                        onClick={handleDeleteAvatar}
                                        disabled={avatarLoading}
                                    >
                                        <Trash2 size={14} /> Remove
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {previewFile && (
                        <p className="avatar-hint">Drop a new image or click the photo to change</p>
                    )}
                    {!previewFile && (
                        <p className="avatar-hint">Click photo or drag & drop to change · Max 5 MB</p>
                    )}
                </div>

                {/* Toast */}
                {message.text && (
                    <div className={`toast-inline toast-${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* ── Profile Form ── */}
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
