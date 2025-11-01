"""Agent session management and lifecycle."""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from threading import Lock

from strands import Agent
from strands.models.ollama import OllamaModel
from config import Config


@dataclass
class Message:
    """Represents a single message in a conversation."""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    tools_used: List[str] = field(default_factory=list)


@dataclass
class Session:
    """Represents a chat session."""
    session_id: str
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: datetime = field(default_factory=datetime.now)
    messages: List[Message] = field(default_factory=list)
    agent: Optional[Agent] = None


class AgentManager:
    """Manages agent sessions and handles agent interactions."""

    def __init__(self):
        self.sessions: Dict[str, Session] = {}
        self.lock = Lock()
        self._ollama_model = None

    @property
    def ollama_model(self):
        """Lazy initialization of Ollama model."""
        if self._ollama_model is None:
            self._ollama_model = OllamaModel(
                host=Config.OLLAMA_HOST,
                model_id=Config.OLLAMA_MODEL
            )
        return self._ollama_model

    def create_session(self) -> str:
        """Create a new chat session."""
        with self.lock:
            # Clean up old sessions if we're at the limit
            if len(self.sessions) >= Config.MAX_SESSIONS:
                self._cleanup_old_sessions()

            session_id = str(uuid.uuid4())
            agent = Agent(model=self.ollama_model)

            session = Session(
                session_id=session_id,
                agent=agent
            )

            self.sessions[session_id] = session
            return session_id

    def get_session(self, session_id: str) -> Optional[Session]:
        """Retrieve a session by ID."""
        with self.lock:
            session = self.sessions.get(session_id)
            if session:
                session.last_activity = datetime.now()
            return session

    def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        with self.lock:
            if session_id in self.sessions:
                session = self.sessions[session_id]
                # Cleanup agent resources
                if session.agent:
                    try:
                        session.agent.cleanup()
                    except Exception:
                        pass  # Best effort cleanup

                del self.sessions[session_id]
                return True
            return False

    def list_sessions(self) -> List[Dict[str, Any]]:
        """List all active sessions."""
        with self.lock:
            return [
                {
                    'session_id': session.session_id,
                    'created_at': session.created_at.isoformat(),
                    'last_activity': session.last_activity.isoformat(),
                    'message_count': len(session.messages)
                }
                for session in self.sessions.values()
            ]

    def get_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get conversation history for a session."""
        session = self.get_session(session_id)
        if not session:
            return []

        return [
            {
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
                'tools_used': msg.tools_used
            }
            for msg in session.messages
        ]

    async def stream_response(self, session_id: str, user_message: str):
        """
        Stream agent response for a user message.

        Yields events in SSE format:
        - {'type': 'message', 'content': '...'}
        - {'type': 'tool', 'tool_name': '...', 'status': 'start'|'end'}
        - {'type': 'done'}
        - {'type': 'error', 'message': '...'}
        """
        print(f"[DEBUG] stream_response called for session {session_id}")
        session = self.get_session(session_id)
        if not session:
            print(f"[ERROR] Session not found: {session_id}")
            yield {'type': 'error', 'message': 'Session not found'}
            return

        if not session.agent:
            print(f"[ERROR] Agent not initialized for session: {session_id}")
            yield {'type': 'error', 'message': 'Agent not initialized'}
            return

        # Add user message to history
        user_msg = Message(role='user', content=user_message)
        session.messages.append(user_msg)
        print(f"[DEBUG] User message added: {user_message[:50]}...")

        # Collect the full response and track tools
        full_response = []
        tools_used = []

        try:
            print(f"[DEBUG] Calling agent with message...")
            # Use synchronous invoke instead of stream_async for now
            result = session.agent(user_message)
            print(f"[DEBUG] Agent returned result: {type(result)}")

            # Extract text content from AgentResult
            # Use the to_dict() method to get a clean dictionary representation
            result_dict = result.to_dict()
            print(f"[DEBUG] Result dict keys: {result_dict.keys()}")

            # Extract content from the message
            if 'message' in result_dict and result_dict['message']:
                message_data = result_dict['message']
                print(f"[DEBUG] Message data: {message_data}")

                if 'content' in message_data and isinstance(message_data['content'], list):
                    # Extract text from all content blocks
                    text_parts = []
                    for block in message_data['content']:
                        if isinstance(block, dict) and 'text' in block:
                            text_parts.append(block['text'])
                    response_content = ''.join(text_parts)
                elif 'content' in message_data and isinstance(message_data['content'], str):
                    response_content = message_data['content']
                else:
                    response_content = str(message_data)
            else:
                response_content = str(result)

            print(f"[DEBUG] Response content type: {type(response_content)}")
            print(f"[DEBUG] Response content length: {len(response_content)}")
            print(f"[DEBUG] Response content preview: {response_content[:100] if len(response_content) > 100 else response_content}...")

            # Stream the response in chunks
            chunk_size = 10
            for i in range(0, len(response_content), chunk_size):
                chunk = response_content[i:i + chunk_size]
                full_response.append(chunk)
                yield {'type': 'message', 'content': chunk}
                await asyncio.sleep(0.01)  # Small delay for streaming effect

            # Store assistant message
            assistant_msg = Message(
                role='assistant',
                content=response_content,
                tools_used=tools_used
            )
            session.messages.append(assistant_msg)
            print(f"[DEBUG] Assistant message stored")

            yield {'type': 'done'}

        except Exception as e:
            error_msg = f"Agent error: {str(e)}"
            print(f"[ERROR] {error_msg}")
            import traceback
            traceback.print_exc()
            yield {'type': 'error', 'message': error_msg}

    def _cleanup_old_sessions(self):
        """Remove sessions that have been inactive for too long."""
        now = datetime.now()
        timeout = timedelta(seconds=Config.SESSION_TIMEOUT)

        sessions_to_remove = [
            session_id
            for session_id, session in self.sessions.items()
            if now - session.last_activity > timeout
        ]

        for session_id in sessions_to_remove:
            self.delete_session(session_id)


# Global agent manager instance
agent_manager = AgentManager()
