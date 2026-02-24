import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within SocketProvider');
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const newSocket = io('http://localhost:5000', {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        newSocket.on('connect', () => setConnected(true));
        newSocket.on('disconnect', () => setConnected(false));

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    const connectSocket = () => {
        if (socket && !socket.connected) {
            socket.connect();
        }
    };

    const disconnectSocket = () => {
        if (socket && socket.connected) {
            socket.disconnect();
        }
    };

    return (
        <SocketContext.Provider value={{ socket, connected, connectSocket, disconnectSocket }}>
            {children}
        </SocketContext.Provider>
    );
};
