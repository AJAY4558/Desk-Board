import React, { useEffect, useRef, useState, useMemo } from 'react';
import { User, MicOff, CameraOff, Pin, PinOff, ChevronLeft, ChevronRight } from 'lucide-react';
import './VideoGrid.css';

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
                        // Continue to set ready even if user denied camera or has no devices
                    } finally {
                        setStreamReady(true);
                        socket.emit('webrtc-ready', { roomId });
                    }
                })();
            }
        }

        socket.on('webrtc-offer', async ({ offer, from, username }) => {
            if (mediaPromiseRef.current) await mediaPromiseRef.current;
            console.log(`[VideoGrid] Received offer from ${username} (${from})`);
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
            console.log(`[VideoGrid] Sending answer to ${username}`);
            socket.emit('webrtc-answer', { to: from, answer });
        });

        socket.on('webrtc-answer', async ({ answer, from }) => {
            if (mediaPromiseRef.current) await mediaPromiseRef.current;
            console.log(`[VideoGrid] Received answer from ${from}`);
            const pc = peerConnections.current[from];
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
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
            console.log(`[VideoGrid] User joined: ${username} (${socketId})`);
            // Priority: Only smaller ID initiates
            if (socketId !== socket.id && socket.id < socketId) {
                console.log(`[VideoGrid] Priority Action: Initiating call to ${username}`);
                initiateCall(socketId, username);
            }
        });

        socket.on('webrtc-ready', async ({ socketId, username }) => {
            if (mediaPromiseRef.current) await mediaPromiseRef.current;
            console.log(`[VideoGrid] User ready: ${username} (${socketId})`);
            // Priority: Only smaller ID initiates
            if (socketId !== socket.id && socket.id < socketId) {
                console.log(`[VideoGrid] Priority Action: Initiating call to ${username}`);
                initiateCall(socketId, username);
            }
        });

        socket.on('user-left', ({ socketId }) => {
            if (peerConnections.current[socketId]) {
                peerConnections.current[socketId].close();
                delete peerConnections.current[socketId];
            }
            if (candidateQueue.current[socketId]) {
                delete candidateQueue.current[socketId];
            }
            setPeers(prev => {
                const next = { ...prev };
                delete next[socketId];
                return next;
            });
            if (pinnedId === socketId) setPinnedId(null);
        });

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            Object.values(peerConnections.current).forEach(pc => pc.close());
            socket.off('webrtc-offer');
            socket.off('webrtc-answer');
            socket.off('webrtc-ice-candidate');
            socket.off('user-joined');
            socket.off('webrtc-ready');
            socket.off('user-left');
        };
    }, [socket, roomId]);

    // Robust Sync Logic: Ensure all online users are connected
    useEffect(() => {
        if (!streamReady || !onlineUsers || !socket?.id) return;

        console.log(`[VideoGrid] Sync check. Online: ${onlineUsers.length}, Socket: ${socket.id}`);

        onlineUsers.forEach(u => {
            const missingPeer = !peers[u.socketId] && !peerConnections.current[u.socketId];
            // Consistent Priority: Only initiate if our ID is smaller
            const isTarget = socket.id < u.socketId;

            if (u.socketId !== socket.id && missingPeer && isTarget) {
                console.log(`[VideoGrid] Priority Action: Sync initiating to ${u.username}`);
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
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (videoTrack) videoTrack.enabled = cameraOn;
            if (audioTrack) audioTrack.enabled = micOn;
        }
    }, [cameraOn, micOn]);

    const createPeerConnection = (socketId, username) => {
        if (peerConnections.current[socketId]) return peerConnections.current[socketId];

        console.log(`[VideoGrid] Creating PC for ${username} (${socketId})`);
        const pc = new RTCPeerConnection(servers);
        peerConnections.current[socketId] = pc;

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        } else {
            console.warn(`[VideoGrid] No local stream available for PC with ${username}`);
            // Add transceivers to receive video and audio even if we don't send
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc-ice-candidate', { to: socketId, candidate: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            setPeers(prev => ({
                ...prev,
                [socketId]: { stream: event.streams[0], username }
            }));
        };

        return pc;
    };

    const initiateCall = async (socketId, username) => {
        if (peerConnections.current[socketId]) return;
        try {
            const pc = createPeerConnection(socketId, username);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log(`[VideoGrid] Sending offer to ${username}`);
            socket.emit('webrtc-offer', { to: socketId, offer, username: user?.username });
        } catch (err) {
            console.error(`[VideoGrid] Failed to initiate call to ${username}:`, err);
        }
    };

    // Unified list of participants for grid/pinning
    const participants = useMemo(() => {
        const list = [
            { id: 'local', stream: localStreamRef.current, username: user?.username, isLocal: true, streamReady, cameraOn, micOn }
        ];

        if (onlineUsers) {
            onlineUsers.forEach(u => {
                // Ensure we handle when we get our own ID in onlineUsers
                if (socket && u.socketId !== socket.id) {
                    const peerData = peers[u.socketId];
                    list.push({
                        id: u.socketId,
                        stream: peerData?.stream || null,
                        username: u.username,
                        isLocal: false,
                        cameraOn: u.cameraOn,
                        micOn: u.micOn
                    });
                }
            });
        }
        return list;
    }, [peers, user, streamReady, onlineUsers, socket, cameraOn, micOn]);

    const handlePin = (id) => {
        setPinnedId(prev => prev === id ? null : id);
    };

    // Layout Logic
    const pinnedParticipant = participants.find(p => p.id === pinnedId);

    // Fallback: If pinned participant is gone, clear pinnedId
    useEffect(() => {
        if (pinnedId && !pinnedParticipant) setPinnedId(null);
    }, [pinnedId, pinnedParticipant]);

    const displayParticipants = (pinnedId && pinnedParticipant) ? [pinnedParticipant] : participants;
    const paginatedParticipants = displayParticipants.slice(currentPage * itemsPerPage, (currentPage * itemsPerPage) + itemsPerPage);
    const totalPages = Math.ceil(displayParticipants.length / itemsPerPage);

    return (
        <div className={`video-grid-wrapper ${pinnedId ? 'has-pinned' : ''}`}>
            <div className={`video-grid-container grid-${paginatedParticipants.length}`}>
                {paginatedParticipants.map(pic => (
                    pic.isLocal ? (
                        <div key="local" className="video-tile local-video">
                            {cameraOn ? (
                                <video ref={localVideoRef} autoPlay playsInline muted />
                            ) : (
                                <div className="video-placeholder">
                                    <div className="avatar-large">
                                        {user?.username?.slice(0, 2).toUpperCase()}
                                    </div>
                                </div>
                            )}
                            <div className="tile-actions">
                                <button className="btn-tile-action" onClick={() => handlePin('local')} title={pinnedId === 'local' ? 'Unpin' : 'Pin'}>
                                    {pinnedId === 'local' ? <PinOff size={16} /> : <Pin size={16} />}
                                </button>
                            </div>
                            <div className="video-label">You {!micOn && <MicOff size={14} />}</div>
                        </div>
                    ) : (
                        <RemoteVideo
                            key={pic.id}
                            stream={pic.stream}
                            username={pic.username}
                            isPinned={pinnedId === pic.id}
                            onPin={() => handlePin(pic.id)}
                            cameraOn={pic.cameraOn}
                            micOn={pic.micOn}
                        />
                    )
                ))}
            </div>

            {totalPages > 1 && !pinnedId && (
                <div className="pagination-controls">
                    <button
                        className="btn-pagination"
                        disabled={currentPage === 0}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="page-indicator">{currentPage + 1} / {totalPages}</span>
                    <button
                        className="btn-pagination"
                        disabled={currentPage >= totalPages - 1}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

const RemoteVideo = ({ stream, username, isPinned, onPin, cameraOn, micOn }) => {
    const videoRef = useRef();
    const hasVideo = !!stream && cameraOn;

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    useEffect(() => {
        const attemptPlay = async () => {
            if (videoRef.current && videoRef.current.paused && hasVideo) {
                try {
                    await videoRef.current.play();
                } catch (err) {
                    console.warn("Autoplay blocked for remote media:", err);
                }
            }
        };
        attemptPlay();
    }, [stream, hasVideo]);

    return (
        <div className="video-tile">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                    display: hasVideo ? 'block' : 'none',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                }}
            />
            {!hasVideo && (
                <div className="video-placeholder">
                    <div className="avatar-large">
                        {username?.slice(0, 2).toUpperCase() || <User size={48} />}
                    </div>
                </div>
            )}
            <div className="tile-actions">
                <button className="btn-tile-action" onClick={onPin}>
                    {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
            </div>
            <div className="video-label">
                {username || 'Guest'} {!micOn && <MicOff size={14} />}
            </div>
        </div>
    );
};

export default VideoGrid;
