import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../services/api';
import {
    Plus, LogIn as JoinIcon, LogOut, User, Clock, Users,
    Copy, Check, Sun, Moon, Trash2, CheckSquare, Square, X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Dashboard.css';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState('');
    const [roomName, setRoomName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState('');

    // Multi-select delete mode
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [deleting, setDeleting] = useState(false);
    const [fadingOut, setFadingOut] = useState(new Set());

    useEffect(() => { loadRooms(); }, []);

    const loadRooms = async () => {
        try {
            const data = await roomAPI.getUserRooms();
            setRooms(data);
        } catch (err) {
            console.error('Failed to load rooms:', err);
        }
    };

    const handleCreateRoom = async () => {
        setLoading(true); setError('');
        try {
            const room = await roomAPI.create(roomName || 'Untitled DeskBoard');
            navigate(`/room/${room.roomId}`);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    const handleJoinRoom = async () => {
        if (!joinRoomId.trim()) { setError('Please enter a Room ID'); return; }
        setLoading(true); setError('');
        try {
            await roomAPI.join(joinRoomId.trim().toUpperCase());
            navigate(`/room/${joinRoomId.trim().toUpperCase()}`);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    /* ── Multi-select helpers ── */
    const enterSelectMode = () => { setSelectMode(true); setSelected(new Set()); };
    const exitSelectMode  = () => { setSelectMode(false); setSelected(new Set()); };

    const toggleSelect = (roomId) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(roomId) ? next.delete(roomId) : next.add(roomId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === rooms.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(rooms.map(r => r.roomId)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selected.size === 0) return;
        const isHost = rooms.some(r => selected.has(r.roomId) && r.host?._id === user?._id);
        const msg = isHost
            ? `Delete ${selected.size} room(s)? Rooms where you're the only member will be permanently deleted.`
            : `Remove ${selected.size} room(s) from your history?`;
        if (!window.confirm(msg)) return;

        setDeleting(true);
        // Fade them out visually
        setFadingOut(new Set(selected));

        setTimeout(async () => {
            const results = await Promise.allSettled(
                [...selected].map(roomId => roomAPI.removeFromHistory(roomId))
            );
            const succeeded = [...selected].filter((_, i) => results[i].status === 'fulfilled');
            setRooms(prev => prev.filter(r => !succeeded.includes(r.roomId)));
            setFadingOut(new Set());
            setSelected(new Set());
            setSelectMode(false);
            setDeleting(false);
        }, 320);
    };

    const copyRoomId = (e, roomId) => {
        e.stopPropagation();
        navigator.clipboard.writeText(roomId);
        setCopied(roomId);
        setTimeout(() => setCopied(''), 2000);
    };

    const handleCardClick = (room) => {
        if (selectMode) { toggleSelect(room.roomId); }
        else { navigate(`/room/${room.roomId}`); }
    };

    const handleLogout = () => { logout(); navigate('/login'); };
    const getInitials = (name) => name ? name.slice(0, 2).toUpperCase() : '??';
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const allSelected = rooms.length > 0 && selected.size === rooms.length;

    return (
        <div className="dashboard-page">
            <div className="dashboard-bg-orbs">
                <div className="orb orb-1" /><div className="orb orb-2" />
            </div>

            {/* Top Navigation */}
            <nav className="dashboard-nav glass-card">
                <div className="nav-left">
                    <div className="nav-logo">
                        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="url(#dashGrad)" />
                            <path d="M8 24V12L16 8L24 12V24L16 20L8 24Z" fill="white" fillOpacity="0.9" />
                            <defs>
                                <linearGradient id="dashGrad" x1="0" y1="0" x2="32" y2="32">
                                    <stop stopColor="#6c5ce7" /><stop offset="1" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <span className="logo-text">DeskBoard</span>
                    </div>
                </div>
                <div className="nav-right">
                    <button className="btn-icon" onClick={toggleTheme} title="Toggle Theme">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button className="btn-icon" onClick={() => navigate('/profile')} title="Profile">
                        {user?.avatar
                            ? <img src={user.avatar} alt="avatar" className="nav-avatar-img" />
                            : <User size={18} />}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                        <LogOut size={16} /><span className="hide-mobile">Logout</span>
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                {/* Welcome */}
                <div className="dashboard-welcome animate-slide-up">
                    <div className="welcome-avatar">
                        {user?.avatar
                            ? <img src={user.avatar} alt="avatar" className="welcome-avatar-img" />
                            : <span>{getInitials(user?.username)}</span>}
                    </div>
                    <div>
                        <h1 className="welcome-title">Welcome, {user?.username}! 👋</h1>
                        <p className="welcome-sub">Create or join a DeskBoard room to start collaborating</p>
                    </div>
                </div>

                {/* Action Cards */}
                <div className="action-cards animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <button className="action-card glass-card" onClick={() => setShowCreateModal(true)}>
                        <div className="action-icon create-icon"><Plus size={28} /></div>
                        <h3>Create Room</h3><p>Start a new DeskBoard session</p>
                    </button>
                    <button className="action-card glass-card" onClick={() => setShowJoinModal(true)}>
                        <div className="action-icon join-icon"><JoinIcon size={28} /></div>
                        <h3>Join Room</h3><p>Enter with a Room ID</p>
                    </button>
                </div>

                {/* Recent Rooms */}
                {rooms.length > 0 && (
                    <div className="recent-section animate-slide-up" style={{ animationDelay: '0.2s' }}>

                        {/* Section header row */}
                        <div className="section-header">
                            <h2 className="section-title">
                                <Clock size={20} /> Recent Rooms
                            </h2>
                            <div className="section-actions">
                                {selectMode ? (
                                    <>
                                        <button className="btn-text" onClick={toggleSelectAll}>
                                            {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                                            {allSelected ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={handleDeleteSelected}
                                            disabled={selected.size === 0 || deleting}
                                        >
                                            <Trash2 size={14} />
                                            Delete{selected.size > 0 ? ` (${selected.size})` : ''}
                                        </button>
                                        <button className="btn-icon" onClick={exitSelectMode} title="Cancel">
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <button className="btn btn-secondary btn-sm" onClick={enterSelectMode}>
                                        <Trash2 size={14} /> Manage
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="rooms-grid">
                            {rooms.map(room => {
                                const isSelected = selected.has(room.roomId);
                                const isFading  = fadingOut.has(room.roomId);
                                return (
                                    <div
                                        key={room._id}
                                        className={`room-card glass-card
                                            ${selectMode ? 'select-mode' : ''}
                                            ${isSelected  ? 'room-selected' : ''}
                                            ${isFading    ? 'room-card-removing' : ''}`}
                                        onClick={() => handleCardClick(room)}
                                    >
                                        {/* Checkbox overlay */}
                                        {selectMode && (
                                            <div className="room-checkbox">
                                                {isSelected
                                                    ? <CheckSquare size={20} className="check-on" />
                                                    : <Square size={20} className="check-off" />}
                                            </div>
                                        )}

                                        <div className="room-card-header">
                                            <h4 className="room-name">{room.name}</h4>
                                            <span className="badge badge-accent">{room.roomId}</span>
                                        </div>
                                        <div className="room-card-meta">
                                            <span className="room-meta-item">
                                                <Users size={14} />{room.participants?.length || 0} members
                                            </span>
                                            <span className="room-meta-item">
                                                <Clock size={14} />{formatDate(room.updatedAt)}
                                            </span>
                                        </div>
                                        <div className="room-card-footer">
                                            <span className="room-host">
                                                Host: {room.host?.username}
                                                {room.host?._id === user?._id && ' (You)'}
                                            </span>
                                            {!selectMode && (
                                                <button
                                                    className="btn-icon btn-copy"
                                                    onClick={(e) => copyRoomId(e, room.roomId)}
                                                    title="Copy Room ID"
                                                >
                                                    {copied === room.roomId ? <Check size={14} /> : <Copy size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setError(''); }}>
                    <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Create New Room</h2>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">Room Name (optional)</label>
                            <input type="text" value={roomName} onChange={e => setRoomName(e.target.value)}
                                placeholder="My DeskBoard" className="input-field" maxLength={100} />
                        </div>
                        {error && <div className="auth-error">{error}</div>}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setError(''); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateRoom} disabled={loading}>
                                {loading ? 'Creating...' : 'Create Room'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Room Modal */}
            {showJoinModal && (
                <div className="modal-overlay" onClick={() => { setShowJoinModal(false); setError(''); }}>
                    <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Join Room</h2>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">Room ID</label>
                            <input type="text" value={joinRoomId}
                                onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                                placeholder="e.g. A1B2C3" className="input-field" maxLength={6}
                                style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }} />
                        </div>
                        {error && <div className="auth-error">{error}</div>}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => { setShowJoinModal(false); setError(''); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleJoinRoom} disabled={loading}>
                                {loading ? 'Joining...' : 'Join Room'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
