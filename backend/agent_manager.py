"""Agent management and lifecycle."""

import asyncio
import traceback
from datetime import datetime
from typing import Optional, AsyncGenerator, Dict, Any
from dataclasses import dataclass
from strands import Agent
from strands.models.ollama import OllamaModel
from config import Config

@dataclass
class Message:
    role: str
    content: str
    timestamp: datetime
    tools_used: list

class AgentManager:
    def __init__(self):
        self.messages: list[Message] = []
        self.agent: Optional[Agent] = None
        self.model = None
        
    def _initialize_model(self):
        """Initialize Ollama model if not already done."""
        if self.model is None:
            self.model = OllamaModel(
                host=Config.OLLAMA_HOST,
                model_id=Config.OLLAMA_MODEL
            )
            print(f"Initialized Ollama model: {Config.OLLAMA_MODEL}")
    
    def _initialize_agent(self):
        """Initialize agent with model if not already done."""
        if self.agent is None:
            self._initialize_model()
            self.agent = Agent(
                model=self.model,
                system_prompt="You are a helpful AI assistant."
            )
            print("Agent initialized")
    
    def get_messages(self) -> list:
        """Get all conversation messages."""
        return [
            {
                'role': msg.role,
                'content': msg.content,
                'timestamp': msg.timestamp.isoformat(),
                'tools_used': msg.tools_used
            }
            for msg in self.messages
        ]
    
    def add_message(self, role: str, content: str, tools_used: list = None):
        """Add a message to conversation history."""
        message = Message(
            role=role,
            content=content,
            timestamp=datetime.now(),
            tools_used=tools_used or []
        )
        self.messages.append(message)
    
    def clear_history(self):
        """Clear conversation history."""
        self.messages = []
        # Reinitialize agent to clear its context
        if self.agent:
            self.agent = None
        print("Conversation history cleared")
    
    async def stream_response(self, user_message: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream agent response for a message."""
        try:
            # Initialize agent if needed
            self._initialize_agent()
            
            # Add user message
            self.add_message('user', user_message)
            
            # Get response from agent
            print(f"Invoking agent with message: {user_message[:50]}...")
            result = self.agent(user_message)
            
            # Extract response using to_dict() method
            result_dict = result.to_dict()
            
            if 'message' in result_dict and result_dict['message']:
                message_data = result_dict['message']
                
                # Extract content from the message
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
                    
                    if response_content:
                        # Add assistant message
                        self.add_message('assistant', response_content)
                        
                        # Stream response in chunks
                        chunk_size = 10
                        for i in range(0, len(response_content), chunk_size):
                            chunk = response_content[i:i + chunk_size]
                            yield {
                                'type': 'message',
                                'content': chunk
                            }
                            await asyncio.sleep(0.01)
                    else:
                        error_msg = "Agent returned empty response"
                        self.add_message('assistant', error_msg)
                        yield {
                            'type': 'error',
                            'message': error_msg
                        }
                else:
                    error_msg = "No content in agent response"
                    self.add_message('assistant', error_msg)
                    yield {
                        'type': 'error',
                        'message': error_msg
                    }
            else:
                error_msg = "Invalid response format from agent"
                self.add_message('assistant', error_msg)
                yield {
                    'type': 'error',
                    'message': error_msg
                }
            
            yield {'type': 'done'}
            
        except Exception as e:
            error_msg = f"Error processing message: {str(e)}"
            print(f"Error in stream_response: {error_msg}")
            traceback.print_exc()
            yield {
                'type': 'error',
                'message': error_msg
            }

# Global agent manager instance
agent_manager = AgentManager()
