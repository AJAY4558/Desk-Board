const API_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
};

// Retry once on network failure (handles Render free-tier cold start / 429)
const fetchWithRetry = async (url, options = {}, retries = 1) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, options);
            return res;
        } catch (err) {
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 2000)); // wait 2s then retry
            } else {
                throw new Error('Server is starting up or unreachable. Please wait a moment and try again.');
            }
        }
    }
};

const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }
    return data;
};

export const authAPI = {
    register: async (userData) => {
        const res = await fetchWithRetry(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return handleResponse(res);
    },

    login: async (credentials) => {
        const res = await fetchWithRetry(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        return handleResponse(res);
    },

    getMe: async () => {
        const res = await fetchWithRetry(`${API_URL}/auth/me`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    }
};

export const roomAPI = {
    create: async (name) => {
        const res = await fetchWithRetry(`${API_URL}/rooms`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name })
        });
        return handleResponse(res);
    },

    get: async (roomId) => {
        const res = await fetchWithRetry(`${API_URL}/rooms/${roomId}`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    join: async (roomId) => {
        const res = await fetchWithRetry(`${API_URL}/rooms/${roomId}/join`, {
            method: 'POST',
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    getUserRooms: async () => {
        const res = await fetchWithRetry(`${API_URL}/rooms/user/my-rooms`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    saveCanvas: async (roomId, canvasData) => {
        const res = await fetchWithRetry(`${API_URL}/rooms/${roomId}/canvas`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ canvasData })
        });
        return handleResponse(res);
    },

    removeFromHistory: async (roomId) => {
        const res = await fetchWithRetry(`${API_URL}/rooms/${roomId}/history`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(res);
    }
};

export const userAPI = {
    getProfile: async () => {
        const res = await fetchWithRetry(`${API_URL}/users/profile`, {
            headers: getHeaders()
        });
        return handleResponse(res);
    },

    updateProfile: async (data) => {
        const res = await fetchWithRetry(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(res);
    },

    uploadAvatar: async (base64DataUrl) => {
        const res = await fetchWithRetry(`${API_URL}/users/avatar`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ avatar: base64DataUrl })
        });
        return handleResponse(res);
    },

    deleteAvatar: async () => {
        const res = await fetchWithRetry(`${API_URL}/users/avatar`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(res);
    }
};

export const fileAPI = {
    upload: async (file) => {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetchWithRetry(`${API_URL}/files/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });
        return handleResponse(res);
    }
};
