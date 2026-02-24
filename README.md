# CollabBoard — Real-Time Collaborative Whiteboard

A full-stack MERN application for real-time collaborative drawing, chat, file sharing, and screen sharing. Features a premium glassmorphism UI (Apple-style) with dark/light mode.

## Features

### Core
- JWT Authentication (Register / Login / Logout)
- Create & Join whiteboard rooms via unique 6-char Room ID
- Real-time drawing synchronization (Socket.io)
- Canvas tools: Pencil, Eraser, Color Picker, Brush Size
- In-room Chat with message history
- Persistent whiteboard sessions in MongoDB
- Responsive UI with React Hooks

### Intermediate
- Undo / Redo functionality
- Save whiteboard as PNG image or to database
- User presence indicator (who is online)
- Protected routes (frontend)
- Role-based permissions (Host / Participant)
- Clear board (Host only with confirmation)

### Advanced
- Screen sharing (WebRTC)
- File sharing inside room (images, PDFs)
- Dark / Light mode toggle
- Profile page with settings
- Mobile responsive (collapsible sidebars, bottom nav)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, React Router, Socket.io Client, Lucide Icons |
| Backend | Node.js, Express 4, Socket.io, JWT, Multer |
| Database | MongoDB with Mongoose |
| Real-time | Socket.io + WebRTC (screen sharing) |
| Styling | Vanilla CSS with Glassmorphism design system |

## Project Structure

```
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Canvas, Toolbar, ChatPanel, etc.
│       ├── context/         # Auth, Socket, Theme contexts
│       ├── pages/           # Login, Register, Dashboard, WhiteboardRoom, Profile
│       ├── services/        # API service layer
│       └── styles/          # Global CSS design system
│
└── server/                  # Express backend (MVC)
    ├── config/              # Database connection
    ├── controllers/         # Auth, Room, User controllers
    ├── middleware/           # JWT auth, Error handler
    ├── models/              # User, Room schemas
    ├── routes/              # REST API routes
    ├── socket/              # Socket.io event handlers
    └── uploads/             # Uploaded files
```

## Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Clone the repository
```bash
git clone <repo-url>
cd Capstone-Whiteboard
```

### 2. Configure environment variables
Edit `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/whiteboard   # ← Your MongoDB URI
JWT_SECRET=your_secret_key_here                  # ← Change this!
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Install dependencies
```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 4. Run the application
```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

### 5. Production build
```bash
cd client
npm run build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms/:roomId` | Get room details |
| POST | `/api/rooms/:roomId/join` | Join room |
| GET | `/api/rooms/user/my-rooms` | Get user's rooms |
| PUT | `/api/rooms/:roomId/canvas` | Save canvas data |
| GET/PUT | `/api/users/profile` | Get/Update profile |
| POST | `/api/files/upload` | Upload file |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-room` | Client → Server | Join a whiteboard room |
| `leave-room` | Client → Server | Leave room |
| `draw` | Bidirectional | Drawing stroke data |
| `erase` | Bidirectional | Eraser stroke data |
| `undo` / `redo` | Bidirectional | History navigation |
| `clear-board` | Bidirectional | Clear canvas (host) |
| `chat-message` | Bidirectional | Chat messages |
| `user-list-update` | Server → Client | Online users list |
| `file-shared` | Bidirectional | File sharing |
| `screen-share-start/stop` | Bidirectional | Screen sharing |
