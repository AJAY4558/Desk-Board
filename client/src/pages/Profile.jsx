import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userAPI } from '../services/api';
import { ArrowLeft, User, Mail, Moon, Sun, Save, Loader, Pencil, Trash2, Upload, X } from 'lucide-react';
import './Profile.css';

/* ── Resize & compress image to Base64 using Canvas ── */
const resizeToBase64 = (file, maxPx = 256, quality = 0.85) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
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

    const [username, setUsername]       = useState('');
    const [pendingTheme, setPendingTheme] = useState(theme);
    const [loading, setLoading]         = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [message, setMessage]         = useState({ text: '', type: '' });

    // Preview state
    const [previewB64, setPreviewB64]   = useState(null);
    const [previewUrl, setPreviewUrl]   = useState(null);
    const [isDragging, setIsDragging]   = useState(false);

    // Avatar edit panel open/close
    const [editOpen, setEditOpen]       = useState(false);

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setPendingTheme(user.theme || theme);
        }
    }, [user]);

    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3500);
    };

    const avatarSrc = previewUrl || user?.avatar || null;
    const initials  = user?.username?.slice(0, 2).toUpperCase() || '??';

    /* ── File processing ── */
    const processFile = async (file) => {
        if (!file) return;
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) { showMessage('Only JPG, PNG, GIF or WebP images allowed', 'error'); return; }
        if (file.size > 10 * 1024 * 1024) { showMessage('Please choose an image under 10 MB', 'error'); return; }
        try {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(file));
            const b64 = await resizeToBase64(file);
            setPreviewB64(b64);
            setEditOpen(false); // close panel, show upload/cancel buttons
        } catch { showMessage('Could not process image', 'error'); }
    };

    const handleFileChange = (e) => processFile(e.target.files?.[0]);
    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]); };

    const cancelPreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null); setPreviewB64(null);
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
        } catch (err) { showMessage(err.message || 'Upload failed', 'error'); }
        finally { setAvatarLoading(false); }
    };

    const handleDeleteAvatar = async () => {
        if (!window.confirm('Remove your profile photo?')) return;
        setAvatarLoading(true);
        setEditOpen(false);
        try {
            await userAPI.deleteAvatar();
            updateUser({ avatar: '' });
            cancelPreview();
            showMessage('Profile photo removed');
        } catch (err) { showMessage(err.message || 'Delete failed', 'error'); }
        finally { setAvatarLoading(false); }
    };

    /* ── Profile save ── */
    const handleSave = async () => {
        setLoading(true);
        try {
            const updated = await userAPI.updateProfile({ username, theme: pendingTheme });
            updateUser({ username: updated.username, theme: updated.theme });
            setTheme(pendingTheme);
            showMessage('Profile updated!');
        } catch (err) { showMessage(err.message || 'Update failed', 'error'); }
        finally { setLoading(false); }
    };

    return (
        <div className="profile-page">
            <div className="auth-bg-orbs">
                <div className="orb orb-1" /><div className="orb orb-2" />
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
                        {/* Avatar circle */}
                        <div className="avatar-frame">
                            {avatarSrc
                                ? <img src={avatarSrc} alt="Avatar" className="avatar-img" />
                                : <div className="avatar-initials">{initials}</div>}

                            {avatarLoading && (
                                <div className="avatar-overlay">
                                    <Loader size={22} className="spin" />
                                </div>
                            )}
                        </div>

                        {/* ✏️ Edit pencil — always visible */}
                        <button
                            className="avatar-edit-btn"
                            onClick={() => setEditOpen(o => !o)}
                            title="Edit photo"
                            disabled={avatarLoading}
                        >
                            <Pencil size={13} />
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="avatar-file-input"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Edit dropdown panel */}
                    {editOpen && !previewB64 && (
                        <div className="avatar-edit-panel animate-slide-down">
                            <button
                                className="avatar-panel-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={15} />
                                {user?.avatar ? 'Change Photo' : 'Upload Photo'}
                            </button>
                            {user?.avatar && (
                                <button
                                    className="avatar-panel-btn danger"
                                    onClick={handleDeleteAvatar}
                                >
                                    <Trash2 size={15} /> Remove Photo
                                </button>
                            )}
                            <button className="avatar-panel-btn muted" onClick={() => setEditOpen(false)}>
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    )}

                    {/* Preview confirm buttons */}
                    {previewB64 && (
                        <div className="avatar-actions">
                            <button className="btn btn-primary btn-sm avatar-btn" onClick={handleUpload} disabled={avatarLoading}>
                                {avatarLoading ? <Loader size={14} className="spin" /> : <Upload size={14} />}
                                Upload Photo
                            </button>
                            <button className="btn btn-secondary btn-sm avatar-btn" onClick={cancelPreview} disabled={avatarLoading}>
                                <X size={14} /> Cancel
                            </button>
                        </div>
                    )}

                    <h1 className="profile-title">{user?.username}</h1>
                    <p className="profile-email"><Mail size={14} /> {user?.email}</p>

                    <p className="avatar-hint">
                        {previewB64
                            ? 'Preview ready — click Upload Photo to save'
                            : 'Click ✏️ to add, change or remove your photo · Drag & drop supported'}
                    </p>
                </div>

                {/* Toast */}
                {message.text && (
                    <div className={`toast-inline toast-${message.type}`}>{message.text}</div>
                )}

                {/* ── Profile Form ── */}
                <div className="profile-form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input
                                type="text" value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="input-field input-with-icon"
                                minLength={3} maxLength={30}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Theme Preference</label>
                        <div className="theme-toggle-row">
                            <button className={`theme-option ${pendingTheme === 'light' ? 'selected' : ''}`} onClick={() => setPendingTheme('light')}>
                                <Sun size={18} /> Light
                            </button>
                            <button className={`theme-option ${pendingTheme === 'dark' ? 'selected' : ''}`} onClick={() => setPendingTheme('dark')}>
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
