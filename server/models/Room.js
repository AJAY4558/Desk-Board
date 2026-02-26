import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const fileSchema = new mongoose.Schema({
    uploader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    uploaderName: String,
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        default: 'Untitled DeskBoard',
        maxlength: 100
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    canvasData: {
        type: mongoose.Schema.Types.Mixed,
        default: []
    },
    chatHistory: [messageSchema],
    files: [fileSchema],
    chatEnabled: {
        type: Boolean,
        default: true
    },
    entryMode: {
        type: String,
        enum: ['direct', 'approval'],
        default: 'direct'
    },
    boardTheme: {
        type: String,
        enum: ['whiteboard', 'blackboard', 'nostalgic'],
        default: 'whiteboard'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
