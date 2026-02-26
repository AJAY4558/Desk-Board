import Room from '../models/Room.js';

const onlineUsers = new Map(); // roomId -> Map(socketId -> { _id, username, socketId, isHost, canEdit, canPresent })
const roomSettings = new Map(); // roomId -> { chatEnabled, entryMode, globalCanvasOpen }
const pendingUsers = new Map();
const activePolls = new Map();

const getRoomSettings = (roomId) => {
    if (!roomSettings.has(roomId)) {
        roomSettings.set(roomId, { chatEnabled: true, entryMode: 'direct', globalCanvasOpen: false });
    }
    return roomSettings.get(roomId);
};

const isHostSocket = (socket, roomId) => {
    const users = onlineUsers.get(roomId);
    if (!users) return false;
    const firstUser = Array.from(users.values())[0];
    return socket.userData?._id === firstUser?._id && users.has(socket.id);
};

const getHostSocketId = (roomId) => {
    const users = onlineUsers.get(roomId);
    if (!users) return null;
    for (const [socketId, userData] of users) {
        if (userData.isHost) return socketId;
    }
    return null;
};

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('join-room', async ({ roomId, user }) => {
            try {
                const room = await Room.findOne({ roomId });
                if (!room) return;

                const isHost = room.host.toString() === user._id;
                const settings = getRoomSettings(roomId);

                if (!isHost && settings.entryMode === 'approval') {
                    if (!pendingUsers.has(roomId)) pendingUsers.set(roomId, new Map());
                    pendingUsers.get(roomId).set(socket.id, { ...user, socketId: socket.id });
                    socket.roomId = roomId;
                    socket.userData = user;
                    socket.emit('waiting-approval');
                    const hostSocketId = getHostSocketId(roomId);
                    if (hostSocketId) {
                        const pending = Array.from(pendingUsers.get(roomId).values());
                        io.to(hostSocketId).emit('pending-users', pending);
                    }
                    return;
                }

                completeJoin(socket, io, roomId, user, isHost, room);
            } catch (error) {
                console.error('Join room error:', error);
            }
        });

        socket.on('join-response', ({ roomId, targetSocketId, approved }) => {
            if (!isUserHost(socket, roomId)) return;
            const pending = pendingUsers.get(roomId);
            if (!pending || !pending.has(targetSocketId)) return;

            const userData = pending.get(targetSocketId);
            pending.delete(targetSocketId);

            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (!targetSocket) return;

            if (approved) {
                Room.findOne({ roomId }).then(room => {
                    if (room) completeJoin(targetSocket, io, roomId, userData, false, room);
                });
            } else {
                targetSocket.emit('join-rejected');
            }

            const hostSocketId = getHostSocketId(roomId);
            if (hostSocketId) {
                const remaining = Array.from(pending.values());
                io.to(hostSocketId).emit('pending-users', remaining);
            }
        });

        socket.on('toggle-chat', ({ roomId, enabled }) => {
            if (!isUserHost(socket, roomId)) return;
            const settings = getRoomSettings(roomId);
            settings.chatEnabled = enabled;
            io.to(roomId).emit('chat-toggled', { enabled });
            Room.findOneAndUpdate({ roomId }, { chatEnabled: enabled }).catch(console.error);
        });

        socket.on('update-entry-mode', ({ roomId, mode }) => {
            if (!isUserHost(socket, roomId)) return;
            const settings = getRoomSettings(roomId);
            settings.entryMode = mode;
            io.to(roomId).emit('entry-mode-updated', { mode });
            Room.findOneAndUpdate({ roomId }, { entryMode: mode }).catch(console.error);
        });

        socket.on('toggle-board', ({ roomId, open }) => {
            const users = onlineUsers.get(roomId);
            const user = users?.get(socket.id);
            if (!user) return;

            const settings = getRoomSettings(roomId);

            // If board is being closed, only the current presenter (or host) can do it
            if (!open && settings.globalCanvasOpen) {
                if (settings.activePresenterId && settings.activePresenterId !== socket.id && !user.isHost) {
                    return; // Ignore if not the presenter or host
                }
            }

            // Only host or user with 'canPresent' can toggle globally
            if (user.isHost || user.canPresent) {
                settings.globalCanvasOpen = open;
                settings.activePresenterId = open ? socket.id : null;

                io.to(roomId).emit('board-status-update', {
                    open,
                    actor: user.username,
                    actorId: settings.activePresenterId
                });
            }
        });

        socket.on('update-permissions', ({ roomId, targetSocketId, permissions }) => {
            const users = onlineUsers.get(roomId);
            const host = users?.get(socket.id);

            // Only host can change permissions
            if (!host || !host.isHost) return;

            const targetUser = users.get(targetSocketId);
            if (targetUser) {
                targetUser.canEdit = permissions.canEdit;
                targetUser.canPresent = permissions.canPresent;
                targetUser.canUseMedia = permissions.canUseMedia;

                // Update specific user
                io.to(targetSocketId).emit('permissions-updated', {
                    canEdit: targetUser.canEdit,
                    canPresent: targetUser.canPresent,
                    canUseMedia: targetUser.canUseMedia
                });

                // Update everyone's user list to reflect status (optional but good for UI)
                const roomUsers = Array.from(users.values());
                io.to(roomId).emit('user-list-update', roomUsers);
            }
        });

        socket.on('kick-user', ({ roomId, targetSocketId }) => {
            if (!isUserHost(socket, roomId)) return;
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (!targetSocket) return;

            const kickedName = targetSocket.userData?.username || 'Unknown';
            targetSocket.emit('you-were-kicked');
            handleDisconnect(targetSocket, io, roomId);
            targetSocket.leave(roomId);
            io.to(roomId).emit('user-kicked', { username: kickedName });
        });

        socket.on('draw', (data) => socket.to(data.roomId).emit('draw', data));
        socket.on('shape', (data) => socket.to(data.roomId).emit('shape', data));
        socket.on('erase', (data) => socket.to(data.roomId).emit('erase', data));
        socket.on('undo', (data) => socket.to(data.roomId).emit('undo', data));
        socket.on('redo', (data) => socket.to(data.roomId).emit('redo', data));
        socket.on('clear-board', (data) => socket.to(data.roomId).emit('clear-board', data));
        socket.on('text', (data) => socket.to(data.roomId).emit('text', data));
        socket.on('image', (data) => socket.to(data.roomId).emit('image', data));
        socket.on('board-theme-change', (data) => {
            socket.to(data.roomId).emit('board-theme-change', data);
            Room.findOneAndUpdate({ roomId: data.roomId }, { boardTheme: data.theme }).catch(console.error);
        });

        socket.on('canvas-update', async (data) => {
            try {
                socket.to(data.roomId).emit('canvas-update', data);
                await Room.findOneAndUpdate({ roomId: data.roomId }, { canvasData: data.canvasData });
            } catch (error) {
                console.error('Canvas update error:', error);
            }
        });

        socket.on('chat-message', async (data) => {
            try {
                const settings = getRoomSettings(data.roomId);
                const senderIsHost = isUserHost(socket, data.roomId);
                if (!settings.chatEnabled && !senderIsHost) {
                    socket.emit('chat-disabled');
                    return;
                }

                const messageData = {
                    sender: data.sender,
                    senderName: data.senderName,
                    content: data.content,
                    timestamp: new Date()
                };
                io.to(data.roomId).emit('chat-message', messageData);
                await Room.findOneAndUpdate(
                    { roomId: data.roomId },
                    { $push: { chatHistory: messageData } }
                );
            } catch (error) {
                console.error('Chat message error:', error);
            }
        });

        socket.on('create-poll', ({ roomId, question, options }) => {
            const settings = getRoomSettings(roomId);
            const senderIsHost = isUserHost(socket, roomId);
            if (!settings.chatEnabled && !senderIsHost) return;

            const pollId = `poll_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            const poll = {
                id: pollId,
                question,
                options: options.map(opt => ({ text: opt, votes: 0 })),
                voters: {},
                createdBy: socket.userData?.username || 'Unknown',
                closed: false,
                timestamp: new Date()
            };

            if (!activePolls.has(roomId)) activePolls.set(roomId, new Map());
            activePolls.get(roomId).set(pollId, poll);

            const pollForClient = { ...poll, voters: undefined };
            io.to(roomId).emit('new-poll', pollForClient);
        });

        socket.on('vote-poll', ({ roomId, pollId, optionIndex }) => {
            const roomPolls = activePolls.get(roomId);
            if (!roomPolls) return;
            const poll = roomPolls.get(pollId);
            if (!poll || poll.closed) return;

            const oderId = socket.userData?._id;
            if (poll.voters[oderId] !== undefined) return;

            if (optionIndex < 0 || optionIndex >= poll.options.length) return;

            poll.voters[oderId] = optionIndex;
            poll.options[optionIndex].votes++;

            const pollForClient = {
                id: poll.id,
                options: poll.options,
                totalVotes: Object.keys(poll.voters).length,
                closed: poll.closed
            };
            io.to(roomId).emit('poll-update', pollForClient);
        });

        socket.on('close-poll', ({ roomId, pollId }) => {
            if (!isUserHost(socket, roomId)) return;
            const roomPolls = activePolls.get(roomId);
            if (!roomPolls) return;
            const poll = roomPolls.get(pollId);
            if (!poll) return;

            poll.closed = true;
            io.to(roomId).emit('poll-closed', { pollId });
        });

        socket.on('file-shared', (data) => socket.to(data.roomId).emit('file-shared', data));

        socket.on('screen-share-start', (data) => {
            socket.to(data.roomId).emit('screen-share-start', {
                userId: socket.userData?._id,
                username: socket.userData?.username
            });
        });

        socket.on('screen-share-stop', (data) => {
            socket.to(data.roomId).emit('screen-share-stop', {
                userId: socket.userData?._id
            });
        });

        socket.on('webrtc-offer', (data) => {
            socket.to(data.to).emit('webrtc-offer', {
                offer: data.offer,
                from: socket.id,
                username: data.username
            });
        });

        socket.on('webrtc-answer', (data) => {
            socket.to(data.to).emit('webrtc-answer', { answer: data.answer, from: socket.id });
        });

        socket.on('webrtc-ice-candidate', (data) => {
            socket.to(data.to).emit('webrtc-ice-candidate', { candidate: data.candidate, from: socket.id });
        });

        socket.on('webrtc-ready', (data) => {
            socket.to(data.roomId).emit('webrtc-ready', {
                socketId: socket.id,
                username: socket.userData?.username
            });
        });

        socket.on('update-media-status', ({ roomId, cameraOn, micOn }) => {
            const users = onlineUsers.get(roomId);
            if (!users) return;
            const user = users.get(socket.id);
            if (user) {
                user.cameraOn = cameraOn;
                user.micOn = micOn;
                io.to(roomId).emit('user-list-update', Array.from(users.values()));
            }
        });

        socket.on('leave-room', async ({ roomId }) => {
            handleDisconnect(socket, io, roomId);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            if (socket.roomId) handleDisconnect(socket, io, socket.roomId);
        });
    });
};

const completeJoin = async (socket, io, roomId, user, isHost, room) => {
    socket.join(roomId);
    socket.roomId = roomId;
    socket.userData = user;
    socket.emit('join-approved');

    if (!onlineUsers.has(roomId)) onlineUsers.set(roomId, new Map());

    onlineUsers.get(roomId).set(socket.id, {
        _id: user._id,
        username: user.username,
        socketId: socket.id,
        isHost,
        canEdit: isHost, // Host can always edit
        canPresent: isHost, // Host can always present
        canUseMedia: isHost, // Host can always use media
        cameraOn: false,
        micOn: false
    });

    if (isHost) {
        const settings = getRoomSettings(roomId);
        settings.chatEnabled = room.chatEnabled !== false;
        settings.entryMode = room.entryMode || 'direct';
        settings.globalCanvasOpen = false;
    }

    const roomUsers = Array.from(onlineUsers.get(roomId).values());
    io.to(roomId).emit('user-list-update', roomUsers);

    socket.to(roomId).emit('user-joined', {
        username: user.username,
        socketId: socket.id,
        message: `${user.username} joined the room`
    });

    if (room.canvasData && room.canvasData.length > 0) {
        socket.emit('canvas-state', room.canvasData);
    }
    if (room.chatHistory && room.chatHistory.length > 0) {
        socket.emit('chat-history', room.chatHistory);
    }

    const settings = getRoomSettings(roomId);
    socket.emit('room-settings', {
        chatEnabled: settings.chatEnabled,
        entryMode: settings.entryMode,
        boardTheme: room.boardTheme || 'whiteboard',
        globalCanvasOpen: settings.globalCanvasOpen || false,
        activePresenterId: settings.activePresenterId || null
    });

    // Send individual permissions to the joining user
    const currentUser = onlineUsers.get(roomId).get(socket.id);
    socket.emit('permissions-updated', {
        canEdit: currentUser.canEdit,
        canPresent: currentUser.canPresent,
        canUseMedia: currentUser.canUseMedia
    });

    const roomPolls = activePolls.get(roomId);
    if (roomPolls) {
        for (const poll of roomPolls.values()) {
            const pollForClient = { ...poll, voters: undefined };
            socket.emit('new-poll', pollForClient);
        }
    }

    if (isHost && pendingUsers.has(roomId)) {
        const pending = Array.from(pendingUsers.get(roomId).values());
        if (pending.length > 0) socket.emit('pending-users', pending);
    }
};

const isUserHost = (socket, roomId) => {
    const users = onlineUsers.get(roomId);
    if (!users) return false;
    const userData = users.get(socket.id);
    return userData?.isHost === true;
};

const handleDisconnect = (socket, io, roomId) => {
    socket.leave(roomId);

    if (onlineUsers.has(roomId)) {
        onlineUsers.get(roomId).delete(socket.id);

        const roomUsers = Array.from(onlineUsers.get(roomId).values());
        io.to(roomId).emit('user-list-update', roomUsers);

        if (socket.userData) {
            socket.to(roomId).emit('user-left', {
                socketId: socket.id,
                username: socket.userData.username,
                message: `${socket.userData.username} left the room`
            });
        }

        if (onlineUsers.get(roomId).size === 0) {
            onlineUsers.delete(roomId);
            roomSettings.delete(roomId);
            pendingUsers.delete(roomId);
            activePolls.delete(roomId);
        }
    }
};

export default socketHandler;
