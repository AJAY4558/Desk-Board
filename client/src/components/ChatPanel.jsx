import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import './ChatPanel.css';

const ChatPanel = ({ messages, onSend, currentUserId }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        onSend(input);
        setInput('');
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="chat-panel">
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-empty">
                        <p>No messages yet</p>
                        <span>Start the conversation!</span>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`chat-msg ${msg.sender === currentUserId ? 'own' : ''}`}
                    >
                        <div className="msg-header">
                            <span className="msg-sender">{msg.senderName}</span>
                            <span className="msg-time">{formatTime(msg.timestamp)}</span>
                        </div>
                        <p className="msg-content">{msg.content}</p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="chat-input-form">
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="input-field chat-input"
                    maxLength={1000}
                />
                <button type="submit" className="btn-icon chat-send" disabled={!input.trim()}>
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
};

export default ChatPanel;
