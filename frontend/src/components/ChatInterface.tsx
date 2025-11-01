import { useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';
import { InputBox } from './InputBox';
import { ToolActivity } from './ToolActivity';
import './ChatInterface.css';

export const ChatInterface = () => {
  const { messages, isStreaming, tools, sendMessage, loadHistory, clearMessages } = useChat();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClearChat = async () => {
    if (window.confirm('Are you sure you want to clear the conversation history?')) {
      await clearMessages();
    }
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h1>AgentVerse Chat</h1>
        <button onClick={handleClearChat} className="clear-button">
          Clear Chat
        </button>
      </div>
      
      <div className="chat-container">
        <MessageList messages={messages} isStreaming={isStreaming} />
        <ToolActivity tools={tools} />
        <InputBox onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
};
