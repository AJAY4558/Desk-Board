import { Crown, X, VolumeX, Volume2, Check, XCircle } from 'lucide-react';
import './OnlineUsers.css';

const OnlineUsers = ({ users, hostId, currentUserId, isHost, onKick, isMuted, onMuteToggle, pendingUsers, onJoinResponse }) => {
    const getInitials = (name) => name ? name.slice(0, 2).toUpperCase() : '??';

    return (
        <div className="online-users">
            {isHost && pendingUsers && pendingUsers.length > 0 && (
                <div className="pending-section">
                    <h4 className="pending-title">Pending Requests ({pendingUsers.length})</h4>
                    {pendingUsers.map((pu) => (
                        <div key={pu.socketId} className="pending-row">
                            <div className="pending-user-info">
                                <div className="user-avatar-sm pending-avatar">
                                    <span>{getInitials(pu.username)}</span>
                                </div>
                                <span className="pending-name">{pu.username}</span>
                            </div>
                            <div className="pending-actions">
                                <button
                                    className="btn btn-primary btn-xs"
                                    onClick={() => onJoinResponse(pu.socketId, true)}
                                >
                                    Approve
                                </button>
                                <button
                                    className="btn btn-danger btn-xs"
                                    onClick={() => onJoinResponse(pu.socketId, false)}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="users-header">
                <span className="users-count">{users.length} participant{users.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="self-mute-toggle" onClick={onMuteToggle}>
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{isMuted ? 'Unmute My Chat' : 'Mute My Chat'}</span>
            </div>

            <div className="users-list">
                {users.map((u) => (
                    <div key={u.socketId} className={`user-item ${u._id === currentUserId ? 'is-you' : ''}`}>
                        <div className="user-avatar-sm">
                            <span>{getInitials(u.username)}</span>
                            <div className="online-dot" />
                        </div>
                        <div className="user-info">
                            <span className="user-name">
                                {u.username}
                                {u._id === currentUserId && <span className="you-tag"> (You)</span>}
                            </span>
                            {u._id === hostId && (
                                <span className="host-badge">
                                    <Crown size={10} /> Host
                                </span>
                            )}
                        </div>
                        {isHost && u._id !== currentUserId && u._id !== hostId && (
                            <button
                                className="btn-icon kick-btn"
                                onClick={() => onKick(u.socketId, u.username)}
                                title={`Kick ${u.username}`}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OnlineUsers;
