import { useEffect, useRef } from 'react';
import type { Message } from '../types';
import './MessageList.css';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

export const MessageList = ({ messages, isStreaming }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="message-list">
      {messages.length === 0 && (
        <div className="empty-state">
          <h2>Welcome to Strands Agent Chat</h2>
          <p>Start a conversation by typing a message below.</p>
        </div>
      )}

      {messages.map((message, index) => (
        <div key={index} className={`message message-${message.role}`}>
          <div className="message-header">
            <span className="message-role">
              {message.role === 'user' ? '👤 You' : '🤖 Agent'}
            </span>
            <span className="message-timestamp">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          <div className="message-content">
            {message.content || (isStreaming && index === messages.length - 1 && (
              <span className="typing-indicator">Thinking...</span>
            ))}
          </div>
          {message.tools_used && message.tools_used.length > 0 && (
            <div className="message-tools">
              <span className="tools-label">Tools used:</span>
              {message.tools_used.map((tool, i) => (
                <span key={i} className="tool-badge">
                  {tool}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  );
};
