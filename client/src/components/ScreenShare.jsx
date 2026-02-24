import { useState, useRef, useCallback } from 'react';
import { Monitor, MonitorOff } from 'lucide-react';
import './ScreenShare.css';

const ScreenShare = ({ socket, roomId }) => {
    const [isSharing, setIsSharing] = useState(false);
    const streamRef = useRef(null);

    const startShare = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: false
            });

            streamRef.current = stream;
            setIsSharing(true);

            socket?.emit('screen-share-start', { roomId });

            stream.getVideoTracks()[0].onended = () => {
                stopShare();
            };
        } catch (err) {
            console.error('Screen share failed:', err);
        }
    };

    const stopShare = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsSharing(false);
        socket?.emit('screen-share-stop', { roomId });
    }, [socket, roomId]);

    return (
        <button
            className={`btn-icon screen-share-btn ${isSharing ? 'sharing' : ''}`}
            onClick={isSharing ? stopShare : startShare}
            title={isSharing ? 'Stop Sharing' : 'Share Screen'}
        >
            {isSharing ? <MonitorOff size={16} /> : <Monitor size={16} />}
        </button>
    );
};

export default ScreenShare;
