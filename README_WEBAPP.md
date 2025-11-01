# Strands Agent Web Application

A web-based chat interface for interacting with Strands AI agents, featuring real-time streaming responses, session management, and tool usage visibility.

## Architecture

- **Backend**: Flask with Server-Sent Events (SSE) for streaming
- **Frontend**: React with TypeScript
- **Agent Framework**: Strands Agents v1.14.0
- **Model**: Ollama (deepseek-r1:8b) running locally

## Features

- 🤖 Real-time streaming agent responses
- 💬 Multi-session conversation management
- 🔧 Live tool usage indicators
- 📝 Conversation history tracking
- 🎨 Clean, responsive UI
- 🔄 Session persistence

## Prerequisites

1. **Python 3.11+**
2. **Node.js 18+** and npm
3. **Ollama** running locally on port 11435 with deepseek-r1:8b model

### Verify Ollama is Running

```bash
curl http://localhost:11435/api/tags
```

## Project Structure

```
.
├── backend/
│   ├── server.py           # Flask server with SSE endpoints
│   ├── agent_manager.py    # Session and agent lifecycle management
│   ├── config.py           # Configuration management
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API client
│   │   ├── hooks/          # React hooks (useChat)
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── vite.config.ts      # Vite configuration with proxy
└── agent.py                # Original standalone agent script
```

## Setup

### 1. Install Python Dependencies

The project uses a shared virtual environment at `.env/` (already created).

```bash
# Activate the virtual environment
source .env/bin/activate  # On macOS/Linux
# .env\Scripts\activate   # On Windows

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

### 3. Configuration

#### Backend Environment Variables

Create `backend/.env` (note: different from the `.env/` directory):

```env
# Flask settings
DEBUG=True
SECRET_KEY=your-secret-key-here

# CORS (allow frontend origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Ollama settings
OLLAMA_HOST=http://localhost:11435
OLLAMA_MODEL=deepseek-r1:8b

# Session settings
MAX_SESSIONS=100
SESSION_TIMEOUT=3600
```

#### Frontend (.env in frontend/)

The `.env` file is already created with:

```env
VITE_API_URL=http://localhost:5001
```

## Running the Application

You need to run both the backend and frontend servers.

### Quick Start (Using Scripts)

**Terminal 1: Start Backend**
```bash
./start-backend.sh
```

**Terminal 2: Start Frontend**
```bash
./start-frontend.sh
```

### Manual Start

**Terminal 1: Start Backend Server**

```bash
source .env/bin/activate  # Activate project virtual environment
cd backend
python server.py
```

The backend will start on **http://localhost:5001**

**Terminal 2: Start Frontend Development Server**

```bash
cd frontend
npm run dev
```

The frontend will start on **http://localhost:5173**

### Access the Application

Open your browser to: **http://localhost:5173**

## API Endpoints

### Sessions

- `GET /api/sessions` - List all active sessions
- `POST /api/sessions` - Create a new session
- `DELETE /api/sessions/{id}` - Delete a session
- `GET /api/sessions/{id}/history` - Get conversation history
- `POST /api/sessions/{id}/clear` - Clear conversation history

### Chat

- `POST /api/chat` - Send a message and stream response
  - Request body: `{ "session_id": "uuid", "message": "text" }`
  - Response: Server-Sent Events stream

### Health

- `GET /api/health` - Health check

## Usage

1. **Create a Session**: Click "New" in the sidebar or wait for auto-creation
2. **Send Messages**: Type in the input box and press Enter (or click Send)
3. **View Streaming**: Watch responses stream in real-time
4. **Monitor Tools**: See which tools the agent uses during processing
5. **Manage Sessions**: Switch between sessions or delete old ones
6. **View History**: All messages are saved per session

## Development

### Frontend Development

The frontend uses Vite for fast development with HMR (Hot Module Replacement):

```bash
cd frontend
npm run dev     # Start dev server
npm run build   # Build for production
npm run preview # Preview production build
```

### Backend Development

The Flask server runs in debug mode by default:

```bash
cd backend
source ../.env/bin/activate  # Use shared project virtual environment
python server.py  # Auto-reloads on file changes
```

### Type Checking

```bash
cd frontend
npx tsc --noEmit  # Check TypeScript types
```

## Troubleshooting

### Backend Issues

**"Module not found" errors:**
```bash
cd backend
source ../.env/bin/activate  # Use shared project virtual environment
pip install -r requirements.txt
```

**Ollama connection errors:**
```bash
# Check if Ollama is running
curl http://localhost:11435/api/tags

# Start Ollama if needed
ollama serve

# Check if model is available
ollama list
```

### Frontend Issues

**"Cannot connect to backend" errors:**
- Ensure backend is running on port 5001
- Check CORS_ORIGINS in backend/.env includes http://localhost:5173
- Verify proxy configuration in vite.config.ts

**React errors:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### CORS Issues

If you see CORS errors in the browser console:

1. Check backend/.env has correct CORS_ORIGINS
2. Restart the backend server after changing CORS_ORIGINS
3. Clear browser cache

## Production Deployment

### Build Frontend

```bash
cd frontend
npm run build
```

This creates optimized static files in `frontend/dist/`

### Serve Frontend with Flask

You can configure Flask to serve the built React app:

```python
# In server.py, add:
from flask import send_from_directory

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

app.static_folder = '../frontend/dist'
```

### Production Server

Use Gunicorn instead of Flask's dev server:

```bash
cd backend
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 server:app
```

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| DEBUG | True | Enable debug mode |
| SECRET_KEY | dev-secret-key... | Flask secret key |
| CORS_ORIGINS | http://localhost:3000,... | Allowed CORS origins |
| OLLAMA_HOST | http://localhost:11435 | Ollama server URL |
| OLLAMA_MODEL | deepseek-r1:8b | Ollama model to use |
| MAX_SESSIONS | 100 | Maximum concurrent sessions |
| SESSION_TIMEOUT | 3600 | Session timeout (seconds) |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:5001 | Backend API URL |

## License

See parent project for license information.
