import React, { useEffect, useRef, useState, useMemo } from 'react';
import { User, MicOff, Pin, PinOff, ChevronLeft, ChevronRight } from 'lucide-react';
import './VideoGrid.css';

/* Deterministic avatar colour from username string */
const getAvatarColor = (name = '') => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `color-${Math.abs(hash) % 8}`;
};

const VideoGrid = ({ socket, roomId, user, cameraOn, micOn, onlineUsers }) => {
    const [peers, setPeers] = useState({}); // { socketId: { stream, username } }
    const [pinnedId, setPinnedId] = useState(null); // 'local' or socketId
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 4;

    const localVideoRef = useRef();
    const localStreamRef = useRef(null);
    const peerConnections = useRef({});
    const candidateQueue = useRef({});
    const servers = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const [streamReady, setStreamReady] = useState(false);
    const mediaPromiseRef = useRef(null);

    useEffect(() => {
        if (socket && roomId) {
            if (!mediaPromiseRef.current) {
                mediaPromiseRef.current = (async () => {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: true
                        });
                        localStreamRef.current = stream;
                        if (localVideoRef.current) {
                            localVideoRef.current.srcObject = stream;
                        }

                        const videoTrack = stream.getVideoTracks()[0];
                        const audioTrack = stream.getAudioTracks()[0];
                        if (videoTrack) videoTrack.enabled = cameraOn;
                        if (audioTrack) audioTrack.enabled = micOn;
                    } catch (err) {
                        console.error('Error accessing media devices:', err);
                    } finally {
                        setStreamReady(true);
                        socket.emit('webrtc-ready', { roomId });
                    }
                })();
            }
        }

        socket.on('webrtc-offer', async ({ offer, from, username }) => {
            if (mediaPromiseRef.current) await mediaPromiseRef.current;
            const pc = createPeerConnection(from, username);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            if (candidateQueue.current[from]) {
                for (const candidate of candidateQueue.current[from]) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                delete candidateQueue.current[from];
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-answer', { to: from, answer });
        });

        socket.on('webrtc-answer', async ({ answer, from }) => {
            if (mediaPromiseRef.current) await mediaPromiseRef.current;
            const pc = peerConnections.current[from];
            if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('webrtc-ice-candidate', async ({ candidate, from }) => {
            if (mediaPromiseRef.current) await mediaPromiseRef.current;
            const pc = peerConnections.current[from];
            if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                if (!candidateQueue.current[from]) candidateQueue.current[from] = [];
                candidateQueue.current[from].push(candidate);
            }
        });

        socket.on('user-joined', async ({ socketId, username }) => {
            if (mediaPromiseRef.current) await mediaPromiseRef.current;
            if (socketId !== socket.id && socket.id < socketId) initiateCall(socketId, username);
        });

        socket.on('webrtc-ready', async ({ socketId, username }) => {
            if (mediaPromiseRef.current) await mediaPromiseRef.current;
            if (socketId !== socket.id && socket.id < socketId) initiateCall(socketId, username);
        });

        socket.on('user-left', ({ socketId }) => {
            if (peerConnections.current[socketId]) {
                peerConnections.current[socketId].close();
                delete peerConnections.current[socketId];
            }
            delete candidateQueue.current[socketId];
            setPeers(prev => {
                const next = { ...prev };
                delete next[socketId];
                return next;
            });
            if (pinnedId === socketId) setPinnedId(null);
        });

        return () => {
            if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
            Object.values(peerConnections.current).forEach(pc => pc.close());
            socket.off('webrtc-offer');
            socket.off('webrtc-answer');
            socket.off('webrtc-ice-candidate');
            socket.off('user-joined');
            socket.off('webrtc-ready');
            socket.off('user-left');
        };
    }, [socket, roomId]);

    useEffect(() => {
        if (!streamReady || !onlineUsers || !socket?.id) return;
        onlineUsers.forEach(u => {
            const missingPeer = !peers[u.socketId] && !peerConnections.current[u.socketId];
            if (u.socketId !== socket.id && missingPeer && socket.id < u.socketId) {
                initiateCall(u.socketId, u.username);
            }
        });
    }, [streamReady, onlineUsers, peers, socket?.id]);

    useEffect(() => {
        if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
    }, [cameraOn, streamReady]);

    useEffect(() => {
        if (localStreamRef.current) {
            const vt = localStreamRef.current.getVideoTracks()[0];
            const at = localStreamRef.current.getAudioTracks()[0];
            if (vt) vt.enabled = cameraOn;
            if (at) at.enabled = micOn;
        }
    }, [cameraOn, micOn]);

    const createPeerConnection = (socketId, username) => {
        if (peerConnections.current[socketId]) return peerConnections.current[socketId];

        const pc = new RTCPeerConnection(servers);
        peerConnections.current[socketId] = pc;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
        } else {
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });
        }

        pc.onicecandidate = (e) => {
            if (e.candidate) socket.emit('webrtc-ice-candidate', { to: socketId, candidate: e.candidate });
        };

        pc.ontrack = (e) => {
            setPeers(prev => ({ ...prev, [socketId]: { stream: e.streams[0], username } }));
        };

        return pc;
    };

    const initiateCall = async (socketId, username) => {
        if (peerConnections.current[socketId]) return;
        try {
            const pc = createPeerConnection(socketId, username);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc-offer', { to: socketId, offer, username: user?.username });
        } catch (err) {
            console.error(`Failed to initiate call to ${username}:`, err);
        }
    };

    const participants = useMemo(() => {
        const list = [
            { id: 'local', stream: localStreamRef.current, username: user?.username, isLocal: true, streamReady, cameraOn, micOn }
        ];
        if (onlineUsers) {
            onlineUsers.forEach(u => {
                if (socket && u.socketId !== socket.id) {
                    const peerData = peers[u.socketId];
                    list.push({
                        id: u.socketId,
                        stream: peerData?.stream || null,
                        username: u.username,
                        avatar: u.avatar || null,
                        isLocal: false,
                        cameraOn: u.cameraOn,
                        micOn: u.micOn,
                        connected: !!peerData?.stream
                    });
                }
            });
        }
        return list;
    }, [peers, user, streamReady, onlineUsers, socket, cameraOn, micOn]);

    const handlePin = (id) => setPinnedId(prev => prev === id ? null : id);

    const pinnedParticipant = participants.find(p => p.id === pinnedId);

    useEffect(() => {
        if (pinnedId && !pinnedParticipant) setPinnedId(null);
    }, [pinnedId, pinnedParticipant]);

    const displayParticipants = (pinnedId && pinnedParticipant) ? [pinnedParticipant] : participants;
    const paginatedParticipants = displayParticipants.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
    const totalPages = Math.ceil(displayParticipants.length / itemsPerPage);

    return (
        <div className={`video-grid-wrapper ${pinnedId ? 'has-pinned' : ''}`}>
            <div className={`video-grid-container grid-${paginatedParticipants.length}`}>
                {paginatedParticipants.map(pic =>
                    pic.isLocal ? (
                        <LocalTile
                            key="local"
                            videoRef={localVideoRef}
                            username={user?.username}
                            avatar={user?.avatar}
                            cameraOn={cameraOn}
                            micOn={micOn}
                            isPinned={pinnedId === 'local'}
                            onPin={() => handlePin('local')}
                        />
                    ) : (
                        <RemoteVideo
                            key={pic.id}
                            stream={pic.stream}
                            username={pic.username}
                            avatar={pic.avatar}
                            isPinned={pinnedId === pic.id}
                            onPin={() => handlePin(pic.id)}
                            cameraOn={pic.cameraOn}
                            micOn={pic.micOn}
                            connected={pic.connected}
                        />
                    )
                )}
            </div>

            {totalPages > 1 && !pinnedId && (
                <div className="pagination-controls">
                    <div className="pagination-inner">
                        <button
                            className="btn-pagination"
                            disabled={currentPage === 0}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="page-indicator">{currentPage + 1} / {totalPages}</span>
                        <button
                            className="btn-pagination"
                            disabled={currentPage >= totalPages - 1}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Local Tile ─────────────────────────── */
const LocalTile = ({ videoRef, username, avatar, cameraOn, micOn, isPinned, onPin }) => {
    const colorClass = getAvatarColor(username);
    return (
        <div className="video-tile local-video">
            {cameraOn ? (
                <video ref={videoRef} autoPlay playsInline muted />
            ) : (
                <div className="video-placeholder">
                    {avatar ? (
                        <img src={avatar} alt={username} className="avatar-photo" />
                    ) : (
                        <div className={`avatar-large ${colorClass}`}>
                            {username?.slice(0, 2).toUpperCase() || <User size={32} />}
                        </div>
                    )}
                </div>
            )}

            {/* Pin action */}
            <div className="tile-actions">
                <button
                    className={`btn-tile-action ${isPinned ? 'pinned' : ''}`}
                    onClick={onPin}
                    title={isPinned ? 'Unpin' : 'Pin'}
                >
                    {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                </button>
            </div>

            {/* Name label */}
            <div className="video-label">
                <span className="you-badge">YOU</span>
                {username}
                {!micOn && <span className="mic-off-badge"><MicOff size={12} /></span>}
            </div>
        </div>
    );
};

/* ── Remote Tile ────────────────────────── */
const RemoteVideo = ({ stream, username, avatar, isPinned, onPin, cameraOn, micOn, connected }) => {
    const videoRef = useRef();
    const hasVideo = !!stream && cameraOn;
    const colorClass = getAvatarColor(username);

    useEffect(() => {
        if (videoRef.current && stream) videoRef.current.srcObject = stream;
    }, [stream]);

    useEffect(() => {
        const play = async () => {
            if (videoRef.current && videoRef.current.paused && hasVideo) {
                try { await videoRef.current.play(); } catch (_) {}
            }
        };
        play();
    }, [stream, hasVideo]);

    return (
        <div className="video-tile">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ display: hasVideo ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {!hasVideo && (
                <div className="video-placeholder">
                    {avatar ? (
                        <img src={avatar} alt={username} className="avatar-photo" />
                    ) : (
                        <div className={`avatar-large ${colorClass}`}>
                            {username?.slice(0, 2).toUpperCase() || <User size={32} />}
                        </div>
                    )}
                </div>
            )}

            {/* Connecting indicator */}
            {!connected && (
                <div className="connecting-badge">
                    <span className="connecting-dot" />
                    Connecting…
                </div>
            )}

            {/* Pin action */}
            <div className="tile-actions">
                <button
                    className={`btn-tile-action ${isPinned ? 'pinned' : ''}`}
                    onClick={onPin}
                    title={isPinned ? 'Unpin' : 'Pin'}
                >
                    {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                </button>
            </div>

            {/* Name label */}
            <div className="video-label">
                {username || 'Guest'}
                {!micOn && <span className="mic-off-badge"><MicOff size={12} /></span>}
            </div>
        </div>
    );
};

export default VideoGrid;
