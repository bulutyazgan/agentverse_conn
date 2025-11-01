# AgentVerse Connection

A full-stack web application for interacting with AI agents powered by Strands Agents framework. Features real-time streaming conversations with a clean, focused single-chat interface.

## Overview

This project implements a web-based chat interface for Strands AI agents, allowing users to have interactive conversations with AI through a modern, responsive web UI. The application uses a Flask backend with Server-Sent Events (SSE) for real-time streaming and a React TypeScript frontend for a smooth user experience. All conversations are stored in a single session with optional history clearing.

## Quick Start

1. **Prerequisites**: Python 3.11+, Node.js 18+, Ollama running on port 11435
2. **Backend**: `./start-backend.sh`
3. **Frontend**: `./start-frontend.sh`
4. **Access**: http://localhost:5173

For detailed setup instructions, see [README_WEBAPP.md](./README_WEBAPP.md).

## Technology Stack

### Backend
- **Framework**: Flask 3.1.0
- **AI Framework**: Strands Agents v1.14.0
- **LLM Provider**: Ollama (deepseek-r1:8b model)
- **Streaming**: Server-Sent Events (SSE)
- **CORS**: flask-cors 5.0.0
- **Environment**: Python 3.11+ virtual environment

### Frontend
- **Framework**: React 18
- **Language**: TypeScript 5
- **Build Tool**: Vite
- **Styling**: CSS3 with CSS Variables
- **HTTP Client**: Fetch API with streaming

### Infrastructure
- **Conversation Storage**: In-memory (single conversation)
- **Development**: Hot Module Replacement (HMR) for both frontend and backend
- **Ports**: Backend on 5001, Frontend on 5173

## Project Structure

```
agentverse_conn/
├── backend/
│   ├── server.py              # Flask application & SSE endpoints
│   ├── agent_manager.py       # Session lifecycle & agent orchestration
│   ├── config.py              # Environment configuration
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend environment variables
├── frontend/
│   ├── src/
│   │   ├── components/        # React UI components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── InputBox.tsx
│   │   │   └── ToolActivity.tsx
│   │   ├── services/
│   │   │   └── api.ts         # API client with streaming support
│   │   ├── hooks/
│   │   │   └── useChat.ts     # Chat state management hook
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript type definitions
│   │   ├── main.tsx           # React app entry point
│   │   └── style.css          # Global styles
│   ├── vite.config.ts         # Vite config with proxy
│   ├── tsconfig.json          # TypeScript configuration
│   ├── package.json           # Frontend dependencies
│   └── .env                   # Frontend environment variables
├── agent.py                   # Original standalone agent script
├── start-backend.sh           # Backend startup script
├── start-frontend.sh          # Frontend startup script
├── README.md                  # This file
├── README_WEBAPP.md           # Detailed web app documentation
├── CLAUDE.md                  # Claude Code integration guide
└── .env/                      # Shared Python virtual environment
```

## Key Features

### Real-Time Streaming
- **SSE-Based Communication**: Server-Sent Events enable real-time response streaming
- **Chunked Response Display**: Text appears progressively as the agent generates it
- **Low Latency**: Direct connection reduces overhead compared to polling

### Single Conversation Focus
- **Streamlined Interface**: One continuous conversation without session management complexity
- **Conversation History**: All messages preserved until manually cleared
- **Clear Chat Button**: Easy history clearing when starting fresh
- **Simplified State Management**: No session switching or selection needed

### Tool Usage Monitoring (UI Ready)
- **Real-Time Tool Indicators**: Visual feedback when agent uses tools (backend support pending)
- **Tool Status Tracking**: Shows active and completed tool usage
- **Tool History**: Records which tools were used in each message

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Clean Aesthetics**: Modern UI with smooth animations and focused layout
- **Keyboard Shortcuts**: Enter to send, efficient navigation
- **Auto-Scroll**: Message list automatically scrolls to newest content

## Architecture Highlights

### Backend Design
- **Single Conversation Architecture**: Global agent manager maintains one continuous conversation
- **Async Event Streaming**: Python asyncio handles SSE streaming
- **Lazy Model Loading**: Ollama model initialized on first use
- **Simplified State Management**: No session locking or complex lifecycle management

### Frontend Design
- **Component-Based Architecture**: Reusable React components
- **Custom Hooks**: `useChat` hook encapsulates chat logic (no session ID needed)
- **Type Safety**: Full TypeScript coverage
- **Streaming Parser**: Handles SSE event parsing and state updates

### Communication Flow
```
User Input → Frontend (React)
    ↓
API Request (POST /api/chat with message)
    ↓
Flask Server → Agent Manager (single global instance)
    ↓
Strands Agent → Ollama Model
    ↓
SSE Stream ← Response Chunks
    ↓
Frontend Updates ← Real-time Display
```

## Development

### Backend Development
```bash
source .env/bin/activate
cd backend
python server.py
```
- Auto-reloads on file changes (Flask debug mode)
- Debug logs with `[DEBUG]` prefix
- CORS enabled for local development

### Frontend Development
```bash
cd frontend
npm run dev
```
- Hot Module Replacement (HMR) enabled
- TypeScript type checking in real-time
- Vite proxy forwards `/api` requests to backend

### Type Checking
```bash
cd frontend
npx tsc --noEmit
```

## API Reference

See [README_WEBAPP.md](./README_WEBAPP.md) for complete API documentation.

**Key Endpoints:**
- `GET /api/health` - Health check with message count
- `GET /api/history` - Retrieve conversation history
- `POST /api/chat` - Send message with streaming response
- `POST /api/clear` - Clear conversation history

## Configuration

### Environment Variables

**Backend (`backend/.env`):**
```env
DEBUG=True
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
OLLAMA_HOST=http://localhost:11435
OLLAMA_MODEL=deepseek-r1:8b
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5001
```

## Contributing

When making changes:
1. Update documentation in this README and README_WEBAPP.md
2. Ensure TypeScript types are properly defined
3. Test streaming functionality end-to-end
4. Verify session management works correctly
5. Check CORS configuration for new endpoints

## Troubleshooting

**Backend won't start:**
- Check Python virtual environment is activated
- Verify Ollama is running: `curl http://localhost:11435/api/tags`
- Ensure port 5001 is not in use

**Frontend shows white screen:**
- Check browser console for errors
- Verify backend is running on port 5001
- Check TypeScript compilation: `npx tsc --noEmit`

**Responses not displaying:**
- Check browser network tab for SSE connection
- Verify backend logs show `[DEBUG]` messages
- Ensure `result.to_dict()` extraction is working

For detailed troubleshooting, see [README_WEBAPP.md](./README_WEBAPP.md).

## License

This project is an exploration of Strands Agents framework for agentic AI applications.