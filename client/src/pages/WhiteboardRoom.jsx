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
import VideoGrid from '../components/VideoGrid';
import {
    LogOut, Copy, Check, Users, Sun, Moon, Save, Download,
    Share2, MessageCircle, PanelRightClose, PanelRightOpen,
    FileImage, FileText, X, GripVertical, Settings,
    Video, VideoOff, Mic, MicOff, Layout, Presentation
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
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [notification, setNotification] = useState('');
    const [canvasOpen, setCanvasOpen] = useState(false);
    const [cameraOn, setCameraOn] = useState(false);
    const [micOn, setMicOn] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canPresent, setCanPresent] = useState(false);
    const [canUseMedia, setCanUseMedia] = useState(false);
    const [activePresenterId, setActivePresenterId] = useState(null);
    const canvasRef = useRef(null);

    const [chatEnabled, setChatEnabled] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [entryMode, setEntryMode] = useState('direct');
    const [pendingUsers, setPendingUsers] = useState([]);
    const [polls, setPolls] = useState([]);
    const [myVotes, setMyVotes] = useState({});
    const [waitingApproval, setWaitingApproval] = useState(false);
    const [hasUnreadChat, setHasUnreadChat] = useState(false);
    const [hasUserNotif, setHasUserNotif] = useState(false);

    useEffect(() => {
        if (socket && roomId) {
            socket.emit('update-media-status', { roomId, cameraOn, micOn });
        }
    }, [cameraOn, micOn, socket, roomId]);

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
        socket.on('chat-message', (msg) => {
            setMessages(prev => [...prev, msg]);
            if (!sidebarOpen || sidebarTab !== 'chat') setHasUnreadChat(true);
        });

        socket.on('file-shared', (data) => {
            setSharedFiles(prev => [...prev, data]);
            showNotification(`${data.uploader} shared a file`);
        });

        socket.on('canvas-state', (data) => {
            if (data && canvasRef.current?.loadCanvasData) {
                canvasRef.current.loadCanvasData(data);
            }
        });

        socket.on('room-settings', (settings) => {
            setChatEnabled(settings.chatEnabled);
            setEntryMode(settings.entryMode);
            if (settings.boardTheme) setBoardTheme(settings.boardTheme);
            if (settings.activePresenterId) setActivePresenterId(settings.activePresenterId);
        });

        socket.on('chat-toggled', ({ enabled }) => {
            setChatEnabled(enabled);
        });

        socket.on('entry-mode-updated', ({ mode }) => {
            setEntryMode(mode);
            showNotification(`Entry mode: ${mode === 'approval' ? 'Approval required' : 'Direct join'}`);
        });

        socket.on('user-kicked', ({ username }) => {
            showNotification(`${username} was kicked`);
        });

        socket.on('you-were-kicked', () => {
            disconnectSocket();
            navigate('/dashboard');
            alert('You were kicked from the room by the host.');
        });

        socket.on('pending-users', (users) => {
            setPendingUsers(users);
            if (users.length > 0) setHasUserNotif(true);
        });
        socket.on('waiting-approval', () => setWaitingApproval(true));
        socket.on('join-approved', () => setWaitingApproval(false));

        socket.on('board-theme-change', ({ theme: newTheme }) => {
            setBoardTheme(newTheme);
        });

        socket.on('join-rejected', () => {
            setWaitingApproval(false);
            navigate('/dashboard');
            alert('The host denied your join request.');
        });

        socket.on('board-status-update', ({ open, actor, actorId }) => {
            setCanvasOpen(open);
            setActivePresenterId(open ? actorId : null);
            if (open) showNotification(`${actor} started presenting`);
            else showNotification(`${actor} stopped presenting`);
        });

        socket.on('permissions-updated', ({ canEdit, canPresent, canUseMedia }) => {
            setCanEdit(canEdit);
            setCanPresent(canPresent);
            setCanUseMedia(canUseMedia);
            if (!canUseMedia && !isHost) {
                setCameraOn(false);
                setMicOn(false);
            }
        });

        socket.on('chat-disabled', () => {
            showNotification('Chat is currently disabled');
        });

        socket.on('new-poll', (poll) => {
            setPolls(prev => {
                const exists = prev.find(p => p.id === poll.id);
                if (exists) return prev;
                return [...prev, poll];
            });
        });

        socket.on('poll-update', (update) => {
            setPolls(prev => prev.map(p => {
                if (p.id !== update.id) return p;
                return { ...p, options: update.options, closed: update.closed };
            }));
        });

        socket.on('poll-closed', ({ pollId }) => {
            setPolls(prev => prev.map(p => p.id === pollId ? { ...p, closed: true } : p));
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
            socket.off('room-settings');
            socket.off('chat-toggled');
            socket.off('entry-mode-updated');
            socket.off('user-kicked');
            socket.off('you-were-kicked');
            socket.off('pending-users');
            socket.off('waiting-approval');
            socket.off('join-approved');
            socket.off('board-theme-change');
            socket.off('join-rejected');
            socket.off('board-status-update');
            socket.off('permissions-updated');
            socket.off('chat-disabled');
            socket.off('new-poll');
            socket.off('poll-update');
            socket.off('poll-closed');
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
        if (socket) socket.emit('leave-room', { roomId });
        disconnectSocket();
        navigate('/dashboard');
    };

    const handleSaveImage = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL?.();
            if (dataUrl) {
                const link = document.createElement('a');
                link.download = `deskboard-${roomId}.png`;
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
        if (canvasRef.current?.clear) {
            canvasRef.current.clear();
            socket?.emit('clear-board', { roomId, userId: user._id });
        }
    };

    const shareRoom = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(`Join my DeskBoard! Room ID: ${roomId}\n${url}`);
        showNotification('Room link copied!');
    };

    const handleBoardThemeChange = (newTheme) => {
        setBoardTheme(newTheme);
        if (socket) {
            socket.emit('board-theme-change', { roomId, theme: newTheme });
        }
    };

    const toggleCanvas = () => {
        if (!isHost && !canPresent) {
            showNotification('You do not have permission to present.');
            return;
        }

        // If board is open, only the presenter (or host) can close it
        if (canvasOpen && activePresenterId && activePresenterId !== socket.id && !isHost) {
            showNotification('Only the presenter can stop the presentation.');
            return;
        }

        const newState = !canvasOpen;
        setCanvasOpen(newState);
        if (socket) socket.emit('toggle-board', { roomId, open: newState });
    };

    const handleUpdatePermission = (targetSocketId, permissions) => {
        if (socket) socket.emit('update-permissions', { roomId, targetSocketId, permissions });
    };

    const openSidebar = (tab) => {
        setSidebarTab(tab);
        setSidebarOpen(true);
        if (tab === 'chat') setHasUnreadChat(false);
        if (tab === 'users') setHasUserNotif(false);
    };

    const handleToggleChat = () => {
        if (!socket) return;
        const next = !chatEnabled;
        socket.emit('toggle-chat', { roomId, enabled: next });
        showNotification(next ? 'You enabled chat' : 'You disabled chat');
    };

    const handleUpdateEntryMode = () => {
        if (!socket) return;
        const newMode = entryMode === 'direct' ? 'approval' : 'direct';
        socket.emit('update-entry-mode', { roomId, mode: newMode });
    };

    const handleKickUser = (targetSocketId, username) => {
        if (!socket) return;
        if (window.confirm(`Kick ${username} from the room?`)) {
            socket.emit('kick-user', { roomId, targetSocketId });
        }
    };

    const handleJoinResponse = (targetSocketId, approved) => {
        if (!socket) return;
        socket.emit('join-response', { roomId, targetSocketId, approved });
    };

    const handleCreatePoll = (question, options) => {
        if (!socket) return;
        socket.emit('create-poll', { roomId, question, options });
    };

    const handleVotePoll = (pollId, optionIndex) => {
        if (!socket) return;
        if (myVotes[pollId] !== undefined) return;
        socket.emit('vote-poll', { roomId, pollId, optionIndex });
        setMyVotes(prev => ({ ...prev, [pollId]: optionIndex }));
    };

    const handleClosePoll = (pollId) => {
        if (!socket) return;
        socket.emit('close-poll', { roomId, pollId });
    };

    const pollsWithVotes = polls.map(p => ({
        ...p,
        votedOption: myVotes[p.id]
    }));

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

    if (waitingApproval) {
        return (
            <div className="wb-loading">
                <div className="loading-spinner" />
                <p>Waiting for host approval...</p>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Cancel</button>
            </div>
        );
    }

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
                    {isHost && (
                        <button className="btn-icon" onClick={() => setShowSettingsModal(true)} title="Room Settings">
                            <Settings size={16} />
                        </button>
                    )}
                    <button className="btn-icon topbar-btn-notif" onClick={() => openSidebar('chat')} title="Chat">
                        <MessageCircle size={16} />
                        {hasUnreadChat && <span className="notif-dot" />}
                    </button>
                    <button className="btn-icon topbar-btn-notif" onClick={() => openSidebar('users')} title="Users">
                        <Users size={16} />
                        {hasUserNotif && <span className="notif-dot" />}
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
                {/* Left Toolbar - Only visible when canvas is open */}
                {canvasOpen && (
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
                        onDownload={handleSaveImage}
                        isHost={isHost}
                        boardTheme={boardTheme}
                        setBoardTheme={handleBoardThemeChange}
                        readOnly={!canEdit && !isHost}
                    />
                )}

                {/* Center: Canvas or Meeting (Both always mounted for sync/connectivity) */}
                <div className={`wb-center-area ${canvasOpen ? 'canvas-mode' : 'meeting-mode'}`}>
                    <div className={`wb-video-wrapper ${canvasOpen ? 'hidden' : ''}`}>
                        <VideoGrid
                            socket={socket}
                            roomId={roomId}
                            user={user}
                            cameraOn={cameraOn}
                            micOn={micOn}
                            onlineUsers={onlineUsers}
                        />
                    </div>

                    <div className={`wb-canvas-area theme-${boardTheme} ${!canvasOpen ? 'hidden' : ''}`}>
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
                            readOnly={!canEdit && !isHost}
                        />
                    </div>
                </div>

                {/* Right Sidebar */}
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
                                        chatEnabled={chatEnabled}
                                        isMuted={isMuted}
                                        polls={pollsWithVotes}
                                        onCreatePoll={handleCreatePoll}
                                        onVotePoll={handleVotePoll}
                                        onClosePoll={handleClosePoll}
                                        isHost={isHost}
                                    />
                                )}
                                {sidebarTab === 'users' && (
                                    <OnlineUsers
                                        users={onlineUsers}
                                        hostId={room.host._id}
                                        currentUserId={user._id}
                                        isHost={isHost}
                                        onKick={handleKickUser}
                                        isMuted={isMuted}
                                        onMuteToggle={() => setIsMuted(prev => !prev)}
                                        pendingUsers={pendingUsers}
                                        onJoinResponse={handleJoinResponse}
                                        onUpdatePermission={handleUpdatePermission}
                                    />
                                )}
                                {sidebarTab === 'files' && (
                                    <div className="files-list">
                                        <div className="files-upload-row">
                                            <FileUpload socket={socket} roomId={roomId} user={user} onUploaded={handleFileUploaded} />
                                            <span className="files-upload-label">Upload a file</span>
                                        </div>
                                        {sharedFiles.length === 0 ? (
                                            <div className="files-empty">
                                                <FileText size={24} />
                                                <p>No files shared yet</p>
                                                <span>Click the upload icon above to share</span>
                                            </div>
                                        ) : (
                                            sharedFiles.map((sf, i) => {
                                                const f = sf.file || sf;
                                                const isImage = f.mimetype?.startsWith('image/');
                                                return (
                                                    <div
                                                        key={i}
                                                        className="file-card glass-card"
                                                        draggable={isImage}
                                                        onDragStart={(e) => {
                                                            if (isImage) {
                                                                e.dataTransfer.setData('application/json', JSON.stringify({
                                                                    type: 'image',
                                                                    url: `http://localhost:5000${f.url}`
                                                                }));
                                                            }
                                                        }}
                                                    >
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
                <div className="bottom-left">
                    <ScreenShare socket={socket} roomId={roomId} />
                </div>

                <div className="bottom-center">
                    <button
                        className={`btn-control ${!micOn ? 'off' : ''} ${(!canUseMedia && !isHost) ? 'disabled' : ''}`}
                        onClick={() => setMicOn(!micOn)}
                        title={micOn ? 'Mute' : 'Unmute'}
                        disabled={!canUseMedia && !isHost}
                    >
                        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>

                    <button
                        className={`btn-control ${!cameraOn ? 'off' : ''} ${(!canUseMedia && !isHost) ? 'disabled' : ''}`}
                        onClick={() => setCameraOn(!cameraOn)}
                        title={cameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
                        disabled={!canUseMedia && !isHost}
                    >
                        {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>

                    <div className="control-divider" />

                    <button
                        className={`btn-control ${canvasOpen ? 'active' : ''} ${(!canPresent && !isHost) ? 'disabled' : ''}`}
                        onClick={toggleCanvas}
                        title={canvasOpen
                            ? (activePresenterId && activePresenterId !== socket.id && !isHost ? 'Only the presenter can stop' : 'Stop Presenting')
                            : 'Open Whiteboard'}
                        disabled={(!canPresent && !isHost) || (canvasOpen && activePresenterId && activePresenterId !== socket.id && !isHost)}
                    >
                        {canvasOpen ? <Presentation size={20} /> : <Layout size={20} />}
                        <span className="control-label">
                            {canvasOpen
                                ? (activePresenterId && activePresenterId !== socket.id && !isHost ? 'Someone else is Presenting' : 'Stop Presenting')
                                : 'Open Board'}
                        </span>
                    </button>
                </div>

                <div className="bottom-right">
                    <button className="btn-icon" onClick={toggleTheme} title="Toggle Theme">
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
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
                        <h2 className="modal-title">Save DeskBoard</h2>
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

            {/* Host Settings Modal */}
            {showSettingsModal && isHost && (
                <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
                    <div className="modal-content animate-scale-in settings-modal" onClick={e => e.stopPropagation()}>
                        <h2 className="modal-title">Room Settings</h2>

                        <div className="settings-list">
                            <div className="setting-row">
                                <div className="setting-info">
                                    <span className="setting-label">Chat</span>
                                    <span className="setting-desc">
                                        {chatEnabled ? 'Chat is enabled for all users' : 'Chat is disabled'}
                                    </span>
                                </div>
                                <button
                                    className={`toggle-switch ${chatEnabled ? 'on' : ''}`}
                                    onClick={handleToggleChat}
                                >
                                    <span className="toggle-thumb" />
                                </button>
                            </div>

                            <div className="setting-row">
                                <div className="setting-info">
                                    <span className="setting-label">Entry Mode</span>
                                    <span className="setting-desc">
                                        {entryMode === 'direct'
                                            ? 'Anyone with the code can join directly'
                                            : 'Users need your approval to join'}
                                    </span>
                                </div>
                                <button
                                    className={`toggle-switch ${entryMode === 'approval' ? 'on' : ''}`}
                                    onClick={handleUpdateEntryMode}
                                >
                                    <span className="toggle-thumb" />
                                </button>
                            </div>
                        </div>



                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSettingsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhiteboardRoom;
