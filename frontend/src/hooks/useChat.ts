import { useState, useCallback } from 'react';
import type { Message, StreamEvent, ToolActivity } from '../types';
import { apiService } from '../services/api';

export const useChat = (sessionId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!sessionId) return;

    try {
      const history = await apiService.getHistory(sessionId);
      setMessages(history);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    }
  }, [sessionId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim() || isStreaming) return;

      setIsStreaming(true);
      setError(null);

      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Prepare assistant message placeholder
      let assistantContent = '';
      const assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        tools_used: [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        for await (const event of apiService.streamChat(sessionId, content)) {
          const streamEvent = event as StreamEvent;

          switch (streamEvent.type) {
            case 'message':
              if (streamEvent.content) {
                assistantContent += streamEvent.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantContent,
                  };
                  return updated;
                });
              }
              break;

            case 'tool':
              if (streamEvent.tool_name) {
                if (streamEvent.status === 'start') {
                  setActiveTools((prev) => [
                    ...prev,
                    { name: streamEvent.tool_name!, status: 'active' },
                  ]);

                  // Add to message tools_used
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (!lastMsg.tools_used) {
                      lastMsg.tools_used = [];
                    }
                    if (!lastMsg.tools_used.includes(streamEvent.tool_name!)) {
                      lastMsg.tools_used.push(streamEvent.tool_name!);
                    }
                    return updated;
                  });
                } else if (streamEvent.status === 'end') {
                  setActiveTools((prev) =>
                    prev.map((tool) =>
                      tool.name === streamEvent.tool_name
                        ? { ...tool, status: 'completed' }
                        : tool
                    )
                  );

                  // Remove completed tools after a delay
                  setTimeout(() => {
                    setActiveTools((prev) =>
                      prev.filter((tool) => tool.name !== streamEvent.tool_name)
                    );
                  }, 2000);
                }
              }
              break;

            case 'error':
              setError(streamEvent.message || 'An error occurred');
              break;

            case 'done':
              setIsStreaming(false);
              setActiveTools([]);
              break;
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Streaming failed');
        setIsStreaming(false);
        setActiveTools([]);

        // Remove the incomplete assistant message
        setMessages((prev) => prev.slice(0, -1));
      }
    },
    [sessionId, isStreaming]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    activeTools,
    error,
    sendMessage,
    loadHistory,
    clearMessages,
  };
};
