import Room from '../models/Room.js';

const onlineUsers = new Map();

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('join-room', async ({ roomId, user }) => {
            try {
                socket.join(roomId);
                socket.roomId = roomId;
                socket.userData = user;

                if (!onlineUsers.has(roomId)) {
                    onlineUsers.set(roomId, new Map());
                }
                onlineUsers.get(roomId).set(socket.id, {
                    _id: user._id,
                    username: user.username,
                    socketId: socket.id
                });

                const roomUsers = Array.from(onlineUsers.get(roomId).values());
                io.to(roomId).emit('user-list-update', roomUsers);

                socket.to(roomId).emit('user-joined', {
                    username: user.username,
                    message: `${user.username} joined the room`
                });

                const room = await Room.findOne({ roomId });
                if (room && room.canvasData && room.canvasData.length > 0) {
                    socket.emit('canvas-state', room.canvasData);
                }
                if (room && room.chatHistory && room.chatHistory.length > 0) {
                    socket.emit('chat-history', room.chatHistory);
                }
            } catch (error) {
                console.error('Join room error:', error);
            }
        });

        socket.on('draw', (data) => {
            socket.to(data.roomId).emit('draw', data);
        });

        socket.on('shape', (data) => {
            socket.to(data.roomId).emit('shape', data);
        });

        socket.on('erase', (data) => {
            socket.to(data.roomId).emit('erase', data);
        });

        socket.on('undo', (data) => {
            socket.to(data.roomId).emit('undo', data);
        });

        socket.on('redo', (data) => {
            socket.to(data.roomId).emit('redo', data);
        });

        socket.on('clear-board', (data) => {
            socket.to(data.roomId).emit('clear-board', data);
        });

        socket.on('text', (data) => {
            socket.to(data.roomId).emit('text', data);
        });

        socket.on('canvas-update', async (data) => {
            try {
                socket.to(data.roomId).emit('canvas-update', data);
                await Room.findOneAndUpdate(
                    { roomId: data.roomId },
                    { canvasData: data.canvasData }
                );
            } catch (error) {
                console.error('Canvas update error:', error);
            }
        });

        socket.on('chat-message', async (data) => {
            try {
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

        socket.on('file-shared', (data) => {
            socket.to(data.roomId).emit('file-shared', data);
        });

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
                from: socket.id
            });
        });

        socket.on('webrtc-answer', (data) => {
            socket.to(data.to).emit('webrtc-answer', {
                answer: data.answer,
                from: socket.id
            });
        });

        socket.on('webrtc-ice-candidate', (data) => {
            socket.to(data.to).emit('webrtc-ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        });

        socket.on('leave-room', async ({ roomId }) => {
            handleDisconnect(socket, io, roomId);
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            if (socket.roomId) {
                handleDisconnect(socket, io, socket.roomId);
            }
        });
    });
};

const handleDisconnect = (socket, io, roomId) => {
    socket.leave(roomId);

    if (onlineUsers.has(roomId)) {
        onlineUsers.get(roomId).delete(socket.id);

        const roomUsers = Array.from(onlineUsers.get(roomId).values());
        io.to(roomId).emit('user-list-update', roomUsers);

        if (socket.userData) {
            socket.to(roomId).emit('user-left', {
                username: socket.userData.username,
                message: `${socket.userData.username} left the room`
            });
        }

        if (onlineUsers.get(roomId).size === 0) {
            onlineUsers.delete(roomId);
        }
    }
};

export default socketHandler;
