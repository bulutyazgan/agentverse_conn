import { useState, useEffect } from 'react';
import { SessionSidebar } from './SessionSidebar';
import { MessageList } from './MessageList';
import { InputBox } from './InputBox';
import { ToolActivity } from './ToolActivity';
import { useChat } from '../hooks/useChat';
import { apiService } from '../services/api';
import './ChatInterface.css';

export const ChatInterface = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { messages, isStreaming, activeTools, error, sendMessage, loadHistory } =
    useChat(sessionId);

  const handleNewSession = async () => {
    try {
      const newSessionId = await apiService.createSession();
      setSessionId(newSessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
    }
  };

  const handleSessionSelect = (selectedSessionId: string) => {
    setSessionId(selectedSessionId);
  };

  useEffect(() => {
    // Create initial session on mount
    if (!sessionId) {
      handleNewSession();
    }
  }, []);

  useEffect(() => {
    // Load history when session changes
    if (sessionId) {
      loadHistory();
    }
  }, [sessionId, loadHistory]);

  return (
    <div className="chat-interface">
      <SessionSidebar
        currentSessionId={sessionId}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
      />

      <div className="chat-main">
        <div className="chat-header">
          <h1>Strands Agent Chat</h1>
          {sessionId && (
            <div className="session-id">
              Session: {sessionId.slice(0, 8)}...
            </div>
          )}
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        )}

        <div className="chat-body">
          <ToolActivity tools={activeTools} />
          <MessageList messages={messages} isStreaming={isStreaming} />
        </div>

        <InputBox
          onSend={sendMessage}
          disabled={!sessionId || isStreaming}
        />
      </div>
    </div>
  );
};
