import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userAPI } from '../services/api';
import { ArrowLeft, User, Mail, Moon, Sun, Save, Loader, Camera, Trash2, Upload, X } from 'lucide-react';
import './Profile.css';

/* ── Resize & compress image to Base64 using a canvas ── */
const resizeToBase64 = (file, maxPx = 256, quality = 0.82) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = url;
    });

const Profile = () => {
    const { user, updateUser } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const fileInputRef = useRef();

    const [username, setUsername] = useState('');
    const [pendingTheme, setPendingTheme] = useState(theme);
    const [loading, setLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Preview state (before upload)
    const [previewB64, setPreviewB64] = useState(null); // compressed base64 ready to upload
    const [previewUrl, setPreviewUrl] = useState(null); // object URL just for display
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setPendingTheme(user.theme || theme);
        }
    }, [user]);

    // Clean up preview object URL on unmount
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3500);
    };

    /* ── Avatar helpers ── */
    const avatarSrc = previewUrl || user?.avatar || null;

    const processFile = async (file) => {
        if (!file) return;
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
            showMessage('Only JPG, PNG, GIF or WebP images allowed', 'error');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showMessage('Please choose an image under 10 MB', 'error');
            return;
        }
        try {
            // Show instant preview via object URL
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(file));

            // Compress in the background
            const b64 = await resizeToBase64(file, 256, 0.82);
            setPreviewB64(b64);
        } catch {
            showMessage('Could not process image', 'error');
        }
    };

    const handleFileChange = (e) => processFile(e.target.files?.[0]);
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]); };

    const cancelPreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewB64(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpload = async () => {
        if (!previewB64) return;
        setAvatarLoading(true);
        try {
            const updated = await userAPI.uploadAvatar(previewB64);
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
            const updated = await userAPI.updateProfile({ username, theme: pendingTheme });
            updateUser({ username: updated.username, theme: updated.theme });
            setTheme(pendingTheme);
            showMessage('Profile updated!');
        } catch (err) {
            showMessage(err.message || 'Update failed', 'error');
        } finally {
            setLoading(false);
        }
    };

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
                        {previewB64 ? (
                            <>
                                <button
                                    className="btn btn-primary btn-sm avatar-btn"
                                    onClick={handleUpload}
                                    disabled={avatarLoading}
                                >
                                    {avatarLoading ? <Loader size={14} className="spin" /> : <Upload size={14} />}
                                    Upload Photo
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

                    <p className="avatar-hint">
                        {previewB64
                            ? 'Click "Upload Photo" to save'
                            : 'Click photo or drag & drop · Auto-resized to 256 px'}
                    </p>
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
                                className={`theme-option ${pendingTheme === 'light' ? 'selected' : ''}`}
                                onClick={() => setPendingTheme('light')}
                            >
                                <Sun size={18} /> Light
                            </button>
                            <button
                                className={`theme-option ${pendingTheme === 'dark' ? 'selected' : ''}`}
                                onClick={() => setPendingTheme('dark')}
                            >
                                <Moon size={18} /> Dark
                            </button>
                        </div>
                        <p className="avatar-hint" style={{ marginTop: 6 }}>Click Save Changes to apply</p>
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
