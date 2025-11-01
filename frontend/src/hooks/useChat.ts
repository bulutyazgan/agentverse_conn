import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { Message, ToolActivity } from '../types';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tools, setTools] = useState<ToolActivity[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const history = await apiService.getHistory();
      setMessages(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);

  const clearMessages = useCallback(async () => {
    try {
      await apiService.clearHistory();
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      tools_used: [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    let assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      tools_used: [],
    };

    // Add empty assistant message placeholder
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      for await (const event of apiService.streamChat(content)) {
        if (event.type === 'message') {
          assistantMessage.content += event.content;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...assistantMessage };
            return newMessages;
          });
        } else if (event.type === 'tool') {
          const toolName = event.tool_name;
          const status = event.status;

          if (status === 'start') {
            setTools((prev) => [...prev, { name: toolName, status: 'active' }]);
          } else if (status === 'end') {
            setTools((prev) =>
              prev.map((tool) =>
                tool.name === toolName ? { ...tool, status: 'completed' } : tool
              )
            );

            setTimeout(() => {
              setTools((prev) => prev.filter((tool) => tool.name !== toolName));
            }, 2000);
          }

          if (!assistantMessage.tools_used) {
            assistantMessage.tools_used = [];
          }
          if (!assistantMessage.tools_used.includes(toolName)) {
            assistantMessage.tools_used.push(toolName);
          }
        } else if (event.type === 'error') {
          console.error('Stream error:', event.message);
          assistantMessage.content = `Error: ${event.message}`;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...assistantMessage };
            return newMessages;
          });
        } else if (event.type === 'done') {
          break;
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      assistantMessage.content = 'Error: Failed to get response from server';
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { ...assistantMessage };
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming]);

  return {
    messages,
    isStreaming,
    tools,
    sendMessage,
    loadHistory,
    clearMessages,
  };
};
