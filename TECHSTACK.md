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

#### Conversation Management (`agent_manager.py`)
```python
@dataclass
class Message:
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime
    tools_used: list

class AgentManager:
    def __init__(self):
        self.messages: list[Message] = []
        self.agent: Optional[Agent] = None
        self.model = None
```

**Key Features**:
- Single global conversation instance
- Lazy model initialization (Ollama model created on first use)
- No threading locks needed (single conversation)
- Message history persists until cleared or server restart
- Automatic agent reinitialization on history clear

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
2. Agent manager retrieved (global `agent_manager` instance)
3. Agent instance called: `result = self.agent(user_message)`
4. Result parsed: `result.to_dict()` extracts message data
5. Response content extracted from `message['content']` array (list of dicts with `text` keys)
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
        async for event in agent_manager.stream_response(message):
            yield f"data: {json.dumps(event)}\n\n"

    # Run the async generator
    gen = stream()
    while True:
        try:
            chunk = loop.run_until_complete(gen.__anext__())
            yield chunk
        except StopAsyncIteration:
            break
```

#### Configuration (`config.py`)
Environment-based configuration using `os.getenv()`:
- Flask settings (DEBUG, SECRET_KEY)
- CORS origins
- Ollama connection details

**Note**: Session-related configs (MAX_SESSIONS, SESSION_TIMEOUT) removed in latest version.

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
- Manages history loading and clearing
- Coordinates message list, tool activity, and input components
- Props: None (root component)

**MessageList.tsx**
- Displays conversation history
- Auto-scrolls to newest messages
- Renders user and assistant messages with different styles
- Shows "Thinking..." indicator during streaming
- Props: `messages: Message[]`, `isStreaming: boolean`

**InputBox.tsx**
- Text input with send button
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Disabled during streaming
- Props: `onSend: (message: string) => void`, `disabled: boolean`

**ToolActivity.tsx**
- Real-time tool usage indicators
- Shows active tools with spinner
- Shows completed tools with checkmark
- Auto-removes completed tools after 2 seconds
- Props: `tools: ToolActivity[]`

**Note**: SessionSidebar removed in latest version (single conversation only).

#### Custom Hooks

**useChat.ts**
Central chat logic hook with state management:

```typescript
export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tools, setTools] = useState<ToolActivity[]>([]);

  // Returns: messages, isStreaming, tools,
  //          sendMessage, loadHistory, clearMessages
}
```

**Key Features**:
- Manages message state with optimistic updates
- Handles SSE stream parsing
- Updates UI incrementally as chunks arrive
- Tracks tool usage in real-time (when backend supports it)
- Error handling and recovery
- No session ID management (simplified from previous version)

#### API Service (`services/api.ts`)

**ApiService Class Methods**:
- `healthCheck()`: GET /api/health
- `getHistory()`: GET /api/history
- `clearHistory()`: POST /api/clear
- `streamChat(message)`: POST /api/chat with streaming

**Removed Methods** (from previous version):
- `listSessions()`, `createSession()`, `deleteSession()`, `getHistory(sessionId)`, `clearHistory(sessionId)`

**Streaming Implementation**:
```typescript
async *streamChat(message: string): AsyncGenerator<any> {
  const response = await fetch(`${this.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),  // No session_id needed
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

**Note**: `Session` interface removed in latest version.

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
- Ensures single conversation point
- No session dictionary or complex state management

#### Factory Pattern
- Agent creation on first message
- Lazy model loading for Ollama

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

**Critical Implementation** (`agent_manager.py:95-108`):
```python
# Use to_dict() to properly extract nested structure
result_dict = result.to_dict()

if 'message' in result_dict and result_dict['message']:
    message_data = result_dict['message']

    if 'content' in message_data and message_data['content']:
        content_blocks = message_data['content']
        
        # Extract text content from all blocks
        response_content = ''
        if isinstance(content_blocks, list):
            for block in content_blocks:
                if isinstance(block, dict) and 'text' in block:
                    response_content += block['text']
        elif isinstance(content_blocks, str):
            response_content = content_blocks
```

**Why This Matters**:
- Strands `AgentResult` has complex nested structure
- Direct string conversion gives dictionary representation
- Content blocks have `text` key directly (NO `type: 'text'` field)
- Must concatenate all blocks (not just first one)
- Must handle both list and string formats

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

### History Clearing

```python
def clear_history(self):
    """Clear conversation history."""
    self.messages = []
    # Reinitialize agent to clear its context
    if self.agent:
        self.agent = None
    print("Conversation history cleared")
```

Removes all messages and resets agent state for fresh start.

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
- In-memory message storage (fast access)
- Asyncio for SSE streaming
- Minimal conversation data (no unnecessary caching)

### Frontend
- Vite's lightning-fast HMR
- Component-level re-rendering (React optimization)
- Efficient SSE stream parsing (incremental buffer processing)

---

## Security Considerations

### Backend
- CORS restricts allowed origins
- No authentication (local development only)
- No session management complexity

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
- Tool usage detection and emission in backend
- File upload support
- Markdown rendering in messages
- Code syntax highlighting
- Export conversation history
- Custom agent configurations
- Multi-user support with isolated conversations
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
