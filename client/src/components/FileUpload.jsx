import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { fileAPI } from '../services/api';
import './FileUpload.css';

const FileUpload = ({ socket, roomId, user, onUploaded }) => {
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const data = await fileAPI.upload(file);

            if (onUploaded) onUploaded(data);

            socket?.emit('file-shared', {
                roomId,
                file: data,
                uploader: user.username
            });
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    return (
        <div className="file-upload">
            <input
                type="file"
                ref={fileRef}
                onChange={handleUpload}
                accept="image/*,.pdf"
                style={{ display: 'none' }}
            />
            <button
                className="btn-icon"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Upload File"
            >
                {uploading ? (
                    <div className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                ) : (
                    <Upload size={16} />
                )}
            </button>
        </div>
    );
};

export default FileUpload;
