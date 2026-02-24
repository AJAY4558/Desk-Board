import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { roomAPI } from '../services/api';
import Canvas from '../components/Canvas';
import Toolbar from '../components/Toolbar';
import ChatPanel from '../components/ChatPanel';
import OnlineUsers from '../components/OnlineUsers';
import FileUpload from '../components/FileUpload';
import ScreenShare from '../components/ScreenShare';
import {
    LogOut, Copy, Check, Users, Sun, Moon, Save, Download,
    Share2, MessageCircle, PanelRightClose, PanelRightOpen,
    FileImage, FileText, X, GripVertical
} from 'lucide-react';
import './WhiteboardRoom.css';

const WhiteboardRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket, connectSocket, disconnectSocket } = useSocket();
    const { theme, toggleTheme } = useTheme();

    const [room, setRoom] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [tool, setTool] = useState('pencil');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [lineStyle, setLineStyle] = useState('solid');
    const [fillEnabled, setFillEnabled] = useState(false);
    const [boardTheme, setBoardTheme] = useState('whiteboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarTab, setSidebarTab] = useState('chat');
    const [sidebarWidth, setSidebarWidth] = useState(340);
    const isResizing = useRef(false);
    const [copied, setCopied] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [notification, setNotification] = useState('');
    const canvasRef = useRef(null);

    useEffect(() => {
        const loadRoom = async () => {
            try {
                const data = await roomAPI.join(roomId);
                setRoom(data);
                setIsHost(data.host._id === user._id);
            } catch (err) {
                navigate('/dashboard');
            }
        };
        loadRoom();
    }, [roomId, user, navigate]);

    useEffect(() => {
        if (!socket || !room) return;
        connectSocket();

        const timer = setTimeout(() => {
            socket.emit('join-room', { roomId, user });
        }, 300);

        socket.on('user-list-update', (users) => setOnlineUsers(users));
        socket.on('user-joined', (data) => showNotification(`${data.username} joined`));
        socket.on('user-left', (data) => showNotification(`${data.username} left`));
        socket.on('chat-history', (history) => setMessages(history));
        socket.on('chat-message', (msg) => setMessages(prev => [...prev, msg]));

        socket.on('file-shared', (data) => {
            setSharedFiles(prev => [...prev, data]);
            showNotification(`${data.uploader} shared a file`);
        });

        socket.on('canvas-state', (data) => {
            if (data && canvasRef.current?.loadCanvasData) {
                canvasRef.current.loadCanvasData(data);
            }
        });

        return () => {
            clearTimeout(timer);
            socket.emit('leave-room', { roomId });
            socket.off('user-list-update');
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('chat-history');
            socket.off('chat-message');
            socket.off('file-shared');
            socket.off('canvas-state');
        };
    }, [socket, room]);

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(''), 3000);
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLeave = async (save = false) => {
        if (save && canvasRef.current) {
            const canvasData = canvasRef.current.getCanvasData?.();
            if (canvasData) {
                try {
                    await roomAPI.saveCanvas(roomId, canvasData);
                } catch (err) {
                    console.error('Save failed:', err);
                }
            }
        }
        if (socket) {
            socket.emit('leave-room', { roomId });
        }
        disconnectSocket();
        navigate('/dashboard');
    };

    const handleSaveImage = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL?.();
            if (dataUrl) {
                const link = document.createElement('a');
                link.download = `whiteboard-${roomId}.png`;
                link.href = dataUrl;
                link.click();
            }
        }
        setShowSaveModal(false);
    };

    const handleSaveDB = async () => {
        if (canvasRef.current) {
            const canvasData = canvasRef.current.getCanvasData?.();
            if (canvasData) {
                try {
                    await roomAPI.saveCanvas(roomId, canvasData);
                    showNotification('Board saved!');
                } catch (err) {
                    showNotification('Save failed');
                }
            }
        }
        setShowSaveModal(false);
    };

    const handleSendMessage = (content) => {
        if (!socket || !content.trim()) return;
        socket.emit('chat-message', {
            roomId,
            sender: user._id,
            senderName: user.username,
            content: content.trim()
        });
    };

    const handleFileUploaded = (fileData) => {
        setSharedFiles(prev => [...prev, { file: fileData, uploader: user.username }]);
    };

    const handleUndo = () => {
        if (canvasRef.current?.undo) {
            canvasRef.current.undo();
            socket?.emit('undo', { roomId, userId: user._id });
        }
    };

    const handleRedo = () => {
        if (canvasRef.current?.redo) {
            canvasRef.current.redo();
            socket?.emit('redo', { roomId, userId: user._id });
        }
    };

    const handleClear = () => {
        if (!isHost) return;
        if (window.confirm('Clear the entire board? This cannot be undone.')) {
            if (canvasRef.current?.clear) {
                canvasRef.current.clear();
                socket?.emit('clear-board', { roomId, userId: user._id });
            }
        }
    };

    const shareRoom = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(`Join my whiteboard! Room ID: ${roomId}\n${url}`);
        showNotification('Room link copied!');
    };

    const openSidebar = (tab) => {
        setSidebarTab(tab);
        setSidebarOpen(true);
    };

    const startResize = useCallback((e) => {
        e.preventDefault();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (e) => {
            if (!isResizing.current) return;
            const newWidth = window.innerWidth - e.clientX;
            setSidebarWidth(Math.max(260, Math.min(600, newWidth)));
        };

        const onMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, []);

    if (!room) {
        return (
            <div className="wb-loading">
                <div className="loading-spinner" />
                <p>Joining room...</p>
            </div>
        );
    }

    return (
        <div className="wb-room">
            {notification && (
                <div className="toast-container">
                    <div className="toast toast-success">{notification}</div>
                </div>
            )}

            {/* Top Bar */}
            <header className="wb-topbar glass-card">
                <div className="topbar-left">
                    <span className="room-badge badge badge-accent" onClick={copyRoomId} title="Click to copy">
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {roomId}
                    </span>
                    <span className="room-name-label">{room.name}</span>
                </div>
                <div className="topbar-center">
                    <span className="badge badge-success">
                        <div className="online-dot" style={{ width: 6, height: 6 }} />
                        {onlineUsers.length} online
                    </span>
                    {isHost && <span className="badge badge-accent">Host</span>}
                </div>
                <div className="topbar-right">
                    <button className="btn-icon" onClick={() => openSidebar('chat')} title="Chat">
                        <MessageCircle size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => openSidebar('users')} title="Users">
                        <Users size={16} />
                    </button>
                    <button className="btn-icon" onClick={shareRoom} title="Share Room">
                        <Share2 size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => setShowSaveModal(true)} title="Save">
                        <Save size={16} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowLeaveModal(true)}>
                        <LogOut size={14} />
                        <span className="hide-mobile">Leave</span>
                    </button>
                </div>
            </header>

            <div className="wb-body">
                {/* Left Toolbar */}
                <Toolbar
                    tool={tool}
                    setTool={setTool}
                    color={color}
                    setColor={setColor}
                    brushSize={brushSize}
                    setBrushSize={setBrushSize}
                    lineStyle={lineStyle}
                    setLineStyle={setLineStyle}
                    fillEnabled={fillEnabled}
                    setFillEnabled={setFillEnabled}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onClear={handleClear}
                    isHost={isHost}
                    boardTheme={boardTheme}
                    setBoardTheme={setBoardTheme}
                />

                {/* Center: Canvas */}
                <div className={`wb-canvas-area theme-${boardTheme}`}>
                    <Canvas
                        ref={canvasRef}
                        tool={tool}
                        color={color}
                        brushSize={brushSize}
                        lineStyle={lineStyle}
                        fillEnabled={fillEnabled}
                        socket={socket}
                        roomId={roomId}
                        boardTheme={boardTheme}
                    />
                </div>

                {/* Right Sidebar (inline) */}
                {sidebarOpen && (
                    <aside className="wb-sidebar open" style={{ width: sidebarWidth }}>
                        <div className="sidebar-resize-handle" onMouseDown={startResize}>
                            <GripVertical size={12} />
                        </div>
                        <div className="sidebar-inner">
                            <div className="sidebar-header">
                                <div className="sidebar-tabs">
                                    <button
                                        className={`sidebar-tab ${sidebarTab === 'chat' ? 'active' : ''}`}
                                        onClick={() => setSidebarTab('chat')}
                                    >
                                        <MessageCircle size={14} /> Chat
                                    </button>
                                    <button
                                        className={`sidebar-tab ${sidebarTab === 'users' ? 'active' : ''}`}
                                        onClick={() => setSidebarTab('users')}
                                    >
                                        <Users size={14} /> Users ({onlineUsers.length})
                                    </button>
                                    <button
                                        className={`sidebar-tab ${sidebarTab === 'files' ? 'active' : ''}`}
                                        onClick={() => setSidebarTab('files')}
                                    >
                                        <FileImage size={14} /> Files ({sharedFiles.length})
                                    </button>
                                </div>
                                <button className="btn-icon sidebar-close" onClick={() => setSidebarOpen(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="sidebar-body">
                                {sidebarTab === 'chat' && (
                                    <ChatPanel
                                        messages={messages}
                                        onSend={handleSendMessage}
                                        currentUserId={user._id}
                                    />
                                )}
                                {sidebarTab === 'users' && (
                                    <OnlineUsers users={onlineUsers} hostId={room.host._id} currentUserId={user._id} />
                                )}
                                {sidebarTab === 'files' && (
                                    <div className="files-list">
                                        {sharedFiles.length === 0 ? (
                                            <div className="files-empty">
                                                <FileText size={24} />
                                                <p>No files shared yet</p>
                                                <span>Use the upload button in the bottom bar</span>
                                            </div>
                                        ) : (
                                            sharedFiles.map((sf, i) => {
                                                const f = sf.file || sf;
                                                const isImage = f.mimetype?.startsWith('image/');
                                                return (
                                                    <div key={i} className="file-card glass-card">
                                                        {isImage && (
                                                            <img
                                                                src={`http://localhost:5000${f.url}`}
                                                                alt={f.originalName}
                                                                className="file-preview"
                                                            />
                                                        )}
                                                        <div className="file-info">
                                                            <span className="file-name">{f.originalName || f.filename}</span>
                                                            <span className="file-meta">
                                                                {sf.uploader} · {(f.size / 1024).toFixed(1)} KB
                                                            </span>
                                                        </div>
                                                        <a
                                                            href={`http://localhost:5000${f.url}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-icon"
                                                            title="Open file"
                                                        >
                                                            <Download size={14} />
                                                        </a>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Bottom Bar */}
            <footer className="wb-bottombar glass-card">
                <ScreenShare socket={socket} roomId={roomId} />
                <button className="btn-icon" onClick={toggleTheme} title="Toggle Theme">
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <FileUpload socket={socket} roomId={roomId} user={user} onUploaded={handleFileUploaded} />
            </footer>



            {/* Leave Modal */}
            {showLeaveModal && (
                <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
                    <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Leave Room?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            Do you want to save the board before leaving?
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                            <button className="btn btn-danger" onClick={() => handleLeave(false)}>Leave</button>
                            <button className="btn btn-primary" onClick={() => handleLeave(true)}>Save & Leave</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
                    <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Save Whiteboard</h2>
                        <div className="save-options">
                            <button className="action-card glass-card" onClick={handleSaveImage}>
                                <Download size={24} />
                                <span>Save as Image</span>
                            </button>
                            <button className="action-card glass-card" onClick={handleSaveDB}>
                                <Save size={24} />
                                <span>Save to Cloud</span>
                            </button>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhiteboardRoom;
