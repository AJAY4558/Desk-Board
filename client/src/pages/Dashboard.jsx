import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomAPI } from '../services/api';
import { Plus, LogIn as JoinIcon, LogOut, User, Clock, Users, Copy, Check, Sun, Moon } from 'lucide-react';
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

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        try {
            const data = await roomAPI.getUserRooms();
            setRooms(data);
        } catch (err) {
            console.error('Failed to load rooms:', err);
        }
    };

    const handleCreateRoom = async () => {
        setLoading(true);
        setError('');
        try {
            const room = await roomAPI.create(roomName || 'Untitled DeskBoard');
            navigate(`/room/${room.roomId}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRoom = async () => {
        if (!joinRoomId.trim()) {
            setError('Please enter a Room ID');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await roomAPI.join(joinRoomId.trim().toUpperCase());
            navigate(`/room/${joinRoomId.trim().toUpperCase()}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyRoomId = (roomId) => {
        navigator.clipboard.writeText(roomId);
        setCopied(roomId);
        setTimeout(() => setCopied(''), 2000);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        return name ? name.slice(0, 2).toUpperCase() : '??';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-bg-orbs">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
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
                                    <stop stopColor="#6c5ce7" />
                                    <stop offset="1" stopColor="#a855f7" />
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
                        <User size={18} />
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                        <LogOut size={16} />
                        <span className="hide-mobile">Logout</span>
                    </button>
                </div>
            </nav>

            <main className="dashboard-main">
                {/* Welcome Section */}
                <div className="dashboard-welcome animate-slide-up">
                    <div className="welcome-avatar">
                        <span>{getInitials(user?.username)}</span>
                    </div>
                    <div>
                        <h1 className="welcome-title">Welcome, {user?.username}! 👋</h1>
                        <p className="welcome-sub">Create or join a DeskBoard room to start collaborating</p>
                    </div>
                </div>

                {/* Action Cards */}
                <div className="action-cards animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <button className="action-card glass-card" onClick={() => setShowCreateModal(true)}>
                        <div className="action-icon create-icon">
                            <Plus size={28} />
                        </div>
                        <h3>Create Room</h3>
                        <p>Start a new DeskBoard session</p>
                    </button>

                    <button className="action-card glass-card" onClick={() => setShowJoinModal(true)}>
                        <div className="action-icon join-icon">
                            <JoinIcon size={28} />
                        </div>
                        <h3>Join Room</h3>
                        <p>Enter with a Room ID</p>
                    </button>
                </div>

                {/* Recent Rooms */}
                {rooms.length > 0 && (
                    <div className="recent-section animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <h2 className="section-title">
                            <Clock size={20} />
                            Recent Rooms
                        </h2>
                        <div className="rooms-grid">
                            {rooms.map(room => (
                                <div key={room._id} className="room-card glass-card" onClick={() => navigate(`/room/${room.roomId}`)}>
                                    <div className="room-card-header">
                                        <h4 className="room-name">{room.name}</h4>
                                        <span className="badge badge-accent">{room.roomId}</span>
                                    </div>
                                    <div className="room-card-meta">
                                        <span className="room-meta-item">
                                            <Users size={14} />
                                            {room.participants?.length || 0} members
                                        </span>
                                        <span className="room-meta-item">
                                            <Clock size={14} />
                                            {formatDate(room.updatedAt)}
                                        </span>
                                    </div>
                                    <div className="room-card-footer">
                                        <span className="room-host">
                                            Host: {room.host?.username}
                                            {room.host?._id === user?._id && ' (You)'}
                                        </span>
                                        <button
                                            className="btn-icon btn-copy"
                                            onClick={(e) => { e.stopPropagation(); copyRoomId(room.roomId); }}
                                            title="Copy Room ID"
                                        >
                                            {copied === room.roomId ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
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
                            <input
                                type="text"
                                value={roomName}
                                onChange={e => setRoomName(e.target.value)}
                                placeholder="My DeskBoard"
                                className="input-field"
                                maxLength={100}
                            />
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
                            <input
                                type="text"
                                value={joinRoomId}
                                onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
                                placeholder="e.g. A1B2C3"
                                className="input-field"
                                maxLength={6}
                                style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}
                            />
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
