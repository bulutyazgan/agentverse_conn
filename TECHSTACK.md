# Technology Stack Reference

Comprehensive technical documentation for the AgentVerse Connection project.

## Table of Contents
- [Core Technologies](#core-technologies)
- [Backend Stack](#backend-stack)
- [Frontend Stack](#frontend-stack)
- [Development Tools](#development-tools)
- [Architecture Patterns](#architecture-patterns)
- [Implementation Details](#implementation-details)

---

## Core Technologies

### AI Framework: Strands Agents v1.14.0
- **Purpose**: Lightweight, code-first framework for building AI agents
- **Philosophy**: Production-ready, model-agnostic framework
- **Key Features**:
  - Built-in observability and tracing
  - Supports 13+ LLM providers
  - MCP (Model Context Protocol) tool integration
  - Async streaming support
  - Session management
- **Documentation**: https://strandsagents.com/latest/documentation/docs/

### LLM Provider: Ollama
- **Model**: deepseek-r1:8b
- **Host**: http://localhost:11435
- **Integration**: Via Strands OllamaModel wrapper
- **Features**:
  - Local inference (no API keys required)
  - Fast response times
  - Privacy-focused (all data stays local)

---

## Backend Stack

### Python 3.11+
Virtual environment located at `.env/` in project root.

### Core Dependencies

#### Flask 3.1.0
- **Role**: Web framework and HTTP server
- **Features Used**:
  - Blueprint routing
  - Request/Response handling
  - Debug mode with auto-reload
  - CORS middleware integration
- **Endpoints**: 8 total (sessions, chat, health)

#### flask-cors 5.0.0
- **Role**: Cross-Origin Resource Sharing
- **Configuration**:
  - Allows `http://localhost:3000` and `http://localhost:5173`
  - Supports preflight OPTIONS requests
  - Credentials support enabled

#### strands-agents 1.14.0
Complete agent framework with dependencies:
- `strands` - Core agent orchestration
- `strands.models.ollama` - Ollama model integration
- OpenTelemetry integration for tracing

### Backend Architecture

#### Session Management (`agent_manager.py`)
```python
@dataclass
class Session:
    session_id: str
    created_at: datetime
    last_activity: datetime
    messages: List[Message]
    agent: Optional[Agent]
```

**Key Features**:
- Thread-safe operations with `threading.Lock`
- Lazy model initialization (Ollama model created on first use)
- Automatic cleanup of inactive sessions
- Maximum 100 concurrent sessions (configurable)
- Session timeout: 3600 seconds (configurable)

#### Message Structure
```python
@dataclass
class Message:
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    tools_used: List[str]
```

#### Agent Invocation Flow
1. User sends message via POST /api/chat
2. Session retrieved from `agent_manager.sessions` dict
3. Agent instance called: `result = session.agent(user_message)`
4. Result parsed: `result.to_dict()` extracts message data
5. Response content extracted from `message['content']` array
6. Text streamed in chunks via SSE

#### Server-Sent Events (SSE)
**Format**:
```
data: {"type": "message", "content": "chunk"}
data: {"type": "tool", "tool_name": "foo", "status": "start"}
data: {"type": "done"}
```

**Event Types**:
- `message`: Text chunk from agent response
- `tool`: Tool usage notification (start/end)
- `done`: Response complete
- `error`: Error occurred

**Implementation**:
```python
def generate():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def stream():
        async for event in agent_manager.stream_response(session_id, message):
            yield f"data: {json.dumps(event)}\n\n"

    yield from loop.run_until_complete(stream())
```

#### Configuration (`config.py`)
Environment-based configuration using `os.getenv()`:
- Flask settings (DEBUG, SECRET_KEY)
- CORS origins
- Ollama connection details
- Session limits and timeouts

---

## Frontend Stack

### Core Framework

#### React 18.3.1
- **Type**: Declarative UI library
- **Rendering**: Virtual DOM with concurrent features
- **State Management**: React hooks (useState, useCallback, useEffect)
- **Component Architecture**: Functional components only

#### TypeScript 5.7.3
- **Configuration**: Strict mode enabled
- **JSX**: `react-jsx` transform
- **Module Resolution**: Bundler
- **Key Settings**:
  - `isolatedModules: true` - Fast transpilation
  - `esModuleInterop: true` - CommonJS compatibility
  - Type-only imports with `import type` syntax

#### Vite 6.0.11
- **Role**: Build tool and dev server
- **Features**:
  - Lightning-fast HMR (Hot Module Replacement)
  - Native ES modules in development
  - Optimized production builds with Rollup
  - Built-in TypeScript support
- **Dev Server**: Port 5173
- **Proxy Configuration**:
  ```typescript
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  }
  ```

### Frontend Dependencies

#### @vitejs/plugin-react 4.3.4
- Babel-based React plugin for Vite
- Fast Refresh support
- JSX runtime integration

#### Development Tools
- TypeScript compiler for type checking
- ESLint for code linting (configured separately)

### Frontend Architecture

#### Component Structure

**ChatInterface.tsx**
- Main container component
- Manages session selection
- Coordinates sidebar and chat area
- Props: None (root component)

**MessageList.tsx**
- Displays conversation history
- Auto-scrolls to newest messages
- Renders user and assistant messages differently
- Props: `messages: Message[]`

**InputBox.tsx**
- Text input with send button
- Keyboard shortcuts (Enter to send)
- Disabled during streaming
- Props: `onSend: (message: string) => void`, `disabled: boolean`

**SessionSidebar.tsx**
- Lists all active sessions
- Create/delete session functionality
- Shows session metadata (message count, last activity)
- Auto-refreshes every 10 seconds
- Props: `currentSessionId`, `onSessionSelect`, `onNewSession`

**ToolActivity.tsx**
- Real-time tool usage indicators
- Shows active tools with spinner
- Shows completed tools with checkmark
- Auto-removes completed tools after 2 seconds
- Props: `tools: ToolActivity[]`

#### Custom Hooks

**useChat.ts**
Central chat logic hook with state management:

```typescript
export const useChat = (sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Returns: messages, isStreaming, activeTools, error,
  //          sendMessage, loadHistory, clearMessages
}
```

**Key Features**:
- Manages message state with optimistic updates
- Handles SSE stream parsing
- Updates UI incrementally as chunks arrive
- Tracks tool usage in real-time
- Error handling and recovery

#### API Service (`services/api.ts`)

**ApiService Class Methods**:
- `healthCheck()`: GET /api/health
- `listSessions()`: GET /api/sessions
- `createSession()`: POST /api/sessions
- `deleteSession(id)`: DELETE /api/sessions/{id}
- `getHistory(id)`: GET /api/sessions/{id}/history
- `clearHistory(id)`: POST /api/sessions/{id}/clear
- `streamChat(id, message)`: POST /api/chat with streaming

**Streaming Implementation**:
```typescript
async *streamChat(sessionId: string, message: string): AsyncGenerator<any> {
  const response = await fetch(`${this.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        yield JSON.parse(line.slice(6));
      }
    }
  }
}
```

#### TypeScript Types (`types/index.ts`)

```typescript
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tools_used?: string[];
}

export interface Session {
  session_id: string;
  created_at: string;
  last_activity: string;
  message_count: number;
}

export interface StreamEvent {
  type: 'message' | 'tool' | 'done' | 'error';
  content?: string;
  tool_name?: string;
  status?: 'start' | 'end';
  message?: string;
}

export interface ToolActivity {
  name: string;
  status: 'active' | 'completed';
}
```

#### Styling System

**CSS Architecture**:
- Component-scoped CSS files
- CSS Variables for theming
- Flexbox and Grid layouts
- Responsive design patterns

**Key CSS Variables** (in `style.css`):
```css
:root {
  --color-primary: #646cff;
  --color-background: #242424;
  --color-surface: #1a1a1a;
  --color-border: #3d3d3d;
  --font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  --border-radius: 8px;
  --spacing-unit: 8px;
}
```

---

## Development Tools

### Version Control
- **Git**: Version control system
- **GitHub**: Repository hosting (if applicable)

### Development Servers

#### Backend Development Server
- Flask built-in dev server with Werkzeug
- Auto-reload on file changes
- Debug mode with detailed error pages
- CORS enabled for cross-origin requests

#### Frontend Development Server
- Vite dev server with esbuild
- Instant HMR updates
- Source maps for debugging
- Proxy API requests to backend

### Scripts

**start-backend.sh**:
```bash
#!/bin/bash
source .env/bin/activate
cd backend
python server.py
```

**start-frontend.sh**:
```bash
#!/bin/bash
cd frontend
npm run dev
```

---

## Architecture Patterns

### Backend Patterns

#### Singleton Pattern
- `AgentManager` has global instance: `agent_manager`
- Ensures single point of session management

#### Factory Pattern
- Agent creation on session initialization
- Lazy model loading for Ollama

#### Repository Pattern
- `AgentManager` acts as repository for sessions
- CRUD operations: create, get, delete, list

#### Observer Pattern (via SSE)
- Server pushes updates to connected clients
- One-way communication channel
- Event-based updates

### Frontend Patterns

#### Container/Presentation Pattern
- `ChatInterface` is container
- `MessageList`, `InputBox` are presentational

#### Custom Hooks Pattern
- `useChat` encapsulates chat logic
- Reusable across components

#### Service Layer Pattern
- `apiService` abstracts HTTP communication
- Centralized API logic

#### Async Generator Pattern
- `streamChat()` uses async generator
- Efficient streaming data handling

---

## Implementation Details

### Response Extraction Logic

**Critical Implementation** (`agent_manager.py:160-182`):
```python
# Use to_dict() to properly extract nested structure
result_dict = result.to_dict()

if 'message' in result_dict and result_dict['message']:
    message_data = result_dict['message']

    if 'content' in message_data and isinstance(message_data['content'], list):
        # Extract text from content blocks
        text_parts = []
        for block in message_data['content']:
            if isinstance(block, dict) and 'text' in block:
                text_parts.append(block['text'])
        response_content = ''.join(text_parts)
```

**Why This Matters**:
- Strands `AgentResult` has complex nested structure
- Direct string conversion gives dictionary representation
- Must extract from `result.message.content[0]['text']`

### Streaming Chunk Size

Backend sends response in 10-character chunks:
```python
chunk_size = 10
for i in range(0, len(response_content), chunk_size):
    chunk = response_content[i:i + chunk_size]
    yield {'type': 'message', 'content': chunk}
    await asyncio.sleep(0.01)  # Small delay for streaming effect
```

This creates a typewriter effect in the UI.

### Session Cleanup Strategy

```python
def _cleanup_old_sessions(self):
    now = datetime.now()
    timeout = timedelta(seconds=Config.SESSION_TIMEOUT)

    sessions_to_remove = [
        session_id
        for session_id, session in self.sessions.items()
        if now - session.last_activity > timeout
    ]

    for session_id in sessions_to_remove:
        self.delete_session(session_id)
```

Runs when session limit reached.

### Error Handling

**Backend**:
- Try/except in stream_response with traceback logging
- Yields error events to client
- Graceful agent cleanup

**Frontend**:
- Try/catch in streamChat async generator
- Error state management in useChat
- User-friendly error display

### CORS Configuration

```python
CORS(app,
     resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
     supports_credentials=True)
```

Allows:
- localhost:3000 (alternative dev port)
- localhost:5173 (Vite default)

### Type Safety

**TypeScript Benefits**:
- Compile-time type checking
- IntelliSense in IDEs
- Refactoring safety
- Self-documenting code

**Example**:
```typescript
// Compile error if wrong type passed
const sendMessage = (content: string) => { ... }
sendMessage(123)  // ❌ Error: Argument of type 'number' not assignable to 'string'
```

---

## Performance Considerations

### Backend
- Lazy Ollama model loading (only loads when first needed)
- In-memory session storage (fast access)
- Asyncio for concurrent SSE streams
- Minimal session data (no unnecessary caching)

### Frontend
- Vite's lightning-fast HMR
- Component-level re-rendering (React optimization)
- Debounced session list refresh (10s interval)
- Efficient SSE stream parsing (incremental buffer processing)

---

## Security Considerations

### Backend
- CORS restricts allowed origins
- Session timeout prevents resource exhaustion
- Max session limit (100) prevents abuse
- No authentication (local development only)

### Frontend
- No sensitive data stored in browser
- API calls over localhost only
- Environment variables for configuration
- No XSS vulnerabilities (React escapes by default)

**Note**: This is a development setup. Production deployment would require:
- HTTPS
- Authentication/Authorization
- Rate limiting
- Input validation
- Session encryption

---

## Dependencies Summary

### Backend (requirements.txt)
```
Flask==3.1.0
flask-cors==5.0.0
strands-agents==1.14.0
python-dotenv==1.0.0
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.17",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.7.3",
    "vite": "^6.0.11"
  }
}
```

---

## Future Enhancements

Potential improvements:
- Persistent storage (SQLite, PostgreSQL)
- User authentication
- File upload support
- Markdown rendering in messages
- Code syntax highlighting
- Export conversation history
- Custom agent configurations per session
- Multi-user support with room system
- WebSocket alternative to SSE
- Production deployment configurations

---

## References

- Strands Agents: https://strandsagents.com
- Flask Documentation: https://flask.palletsprojects.com
- React Documentation: https://react.dev
- TypeScript Handbook: https://www.typescriptlang.org/docs
- Vite Guide: https://vite.dev/guide
- SSE Specification: https://html.spec.whatwg.org/multipage/server-sent-events.html
