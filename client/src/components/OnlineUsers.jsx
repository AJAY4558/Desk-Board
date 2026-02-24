import { Crown } from 'lucide-react';
import './OnlineUsers.css';

const OnlineUsers = ({ users, hostId, currentUserId }) => {
    const getInitials = (name) => name ? name.slice(0, 2).toUpperCase() : '??';

    return (
        <div className="online-users">
            <div className="users-header">
                <span className="users-count">{users.length} participant{users.length !== 1 ? 's' : ''}</span>
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
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OnlineUsers;
