import { useState, useRef, useEffect } from 'react';
import { Send, BarChart3, Plus, X, Check } from 'lucide-react';
import './ChatPanel.css';

const ChatPanel = ({
    messages, onSend, currentUserId,
    chatEnabled, isMuted,
    polls, onCreatePoll, onVotePoll, onClosePoll, isHost
}) => {
    const [input, setInput] = useState('');
    const [showPollForm, setShowPollForm] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, polls]);

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

    const addOption = () => {
        if (pollOptions.length >= 4) return;
        setPollOptions([...pollOptions, '']);
    };

    const removeOption = (index) => {
        if (pollOptions.length <= 2) return;
        setPollOptions(pollOptions.filter((_, i) => i !== index));
    };

    const updateOption = (index, value) => {
        const updated = [...pollOptions];
        updated[index] = value;
        setPollOptions(updated);
    };

    const submitPoll = () => {
        const trimmedQ = pollQuestion.trim();
        const validOptions = pollOptions.map(o => o.trim()).filter(Boolean);
        if (!trimmedQ || validOptions.length < 2) return;

        onCreatePoll(trimmedQ, validOptions);
        setPollQuestion('');
        setPollOptions(['', '']);
        setShowPollForm(false);
    };

    const chatBlockedForUser = !chatEnabled && !isHost;
    const isInputDisabled = chatBlockedForUser || isMuted;
    const isPollDisabled = chatBlockedForUser;
    const disabledMessage = chatBlockedForUser
        ? 'Chat disabled by host'
        : isMuted
            ? 'You muted your chat'
            : '';

    return (
        <div className="chat-panel">
            <div className="chat-messages">
                {messages.length === 0 && polls.length === 0 && (
                    <div className="chat-empty">
                        <p>No messages yet</p>
                        <span>Start the conversation!</span>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={`msg-${i}`}
                        className={`chat-msg ${msg.sender === currentUserId ? 'own' : ''}`}
                    >
                        <div className="msg-header">
                            <span className="msg-sender">{msg.senderName}</span>
                            <span className="msg-time">{formatTime(msg.timestamp)}</span>
                        </div>
                        <p className="msg-content">{msg.content}</p>
                    </div>
                ))}

                {polls.map((poll) => (
                    <PollCard
                        key={poll.id}
                        poll={poll}
                        currentUserId={currentUserId}
                        onVote={(optionIndex) => onVotePoll(poll.id, optionIndex)}
                        onClose={() => onClosePoll(poll.id)}
                        isHost={isHost}
                    />
                ))}

                <div ref={messagesEndRef} />
            </div>

            {showPollForm && (
                <div className="poll-form">
                    <div className="poll-form-header">
                        <span className="poll-form-title">Create Poll</span>
                        <button className="btn-icon" onClick={() => setShowPollForm(false)}>
                            <X size={14} />
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Ask a question..."
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="input-field poll-question-input"
                        maxLength={200}
                    />
                    {pollOptions.map((opt, i) => (
                        <div key={i} className="poll-option-row">
                            <input
                                type="text"
                                placeholder={`Option ${i + 1}`}
                                value={opt}
                                onChange={(e) => updateOption(i, e.target.value)}
                                className="input-field poll-option-input"
                                maxLength={100}
                            />
                            {pollOptions.length > 2 && (
                                <button className="btn-icon" onClick={() => removeOption(i)}>
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))}
                    <div className="poll-form-actions">
                        {pollOptions.length < 4 && (
                            <button className="btn btn-secondary btn-xs" onClick={addOption}>
                                <Plus size={12} /> Add Option
                            </button>
                        )}
                        <button className="btn btn-primary btn-xs" onClick={submitPoll}>
                            <Check size={12} /> Create
                        </button>
                    </div>
                </div>
            )}

            {isInputDisabled && (
                <div className="chat-disabled-banner">{disabledMessage}</div>
            )}

            <form onSubmit={handleSubmit} className="chat-input-form">
                <button
                    type="button"
                    className="btn-icon poll-trigger"
                    onClick={() => !isPollDisabled && setShowPollForm(!showPollForm)}
                    title={isPollDisabled ? 'Polls disabled' : 'Create Poll'}
                    disabled={isPollDisabled}
                >
                    <BarChart3 size={16} />
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={isInputDisabled ? disabledMessage : 'Type a message...'}
                    className="input-field chat-input"
                    maxLength={1000}
                    disabled={isInputDisabled}
                />
                <button type="submit" className="btn-icon chat-send" disabled={!input.trim() || isInputDisabled}>
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
};

const PollCard = ({ poll, currentUserId, onVote, onClose, isHost }) => {
    const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
    const hasVoted = poll.votedOption !== undefined && poll.votedOption !== null;

    return (
        <div className="poll-card">
            <div className="poll-header">
                <BarChart3 size={14} />
                <span className="poll-creator">{poll.createdBy}</span>
                {poll.closed && <span className="poll-closed-tag">Closed</span>}
            </div>
            <p className="poll-question">{poll.question}</p>
            <div className="poll-options">
                {poll.options.map((opt, i) => {
                    const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                    const isSelected = poll.votedOption === i;
                    const canVote = !hasVoted && !poll.closed;

                    return (
                        <button
                            key={i}
                            className={`poll-option-btn ${isSelected ? 'selected' : ''} ${!canVote ? 'voted' : ''}`}
                            onClick={() => canVote && onVote(i)}
                            disabled={!canVote}
                        >
                            <span className="poll-option-text">{opt.text}</span>
                            {(hasVoted || poll.closed) && (
                                <span className="poll-option-pct">{pct}%</span>
                            )}
                            {(hasVoted || poll.closed) && (
                                <div className="poll-option-bar" style={{ width: `${pct}%` }} />
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="poll-footer">
                <span className="poll-votes">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
                {isHost && !poll.closed && (
                    <button className="poll-close-btn" onClick={onClose}>Close Poll</button>
                )}
            </div>
        </div>
    );
};

export default ChatPanel;
