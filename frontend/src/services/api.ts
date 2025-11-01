import type { Session, Message } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  async listSessions(): Promise<Session[]> {
    const response = await fetch(`${this.baseUrl}/api/sessions`);
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    const data = await response.json();
    return data.sessions;
  }

  async createSession(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    const data = await response.json();
    return data.session_id;
  }

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete session');
    }
  }

  async getHistory(sessionId: string): Promise<Message[]> {
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/history`);
    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }
    const data = await response.json();
    return data.messages;
  }

  async clearHistory(sessionId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}/clear`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to clear history');
    }
  }

  /**
   * Send a message and get an EventSource for streaming responses.
   * Caller is responsible for closing the EventSource.
   */
  createChatStream(sessionId: string, message: string): EventSource {
    // For POST requests with EventSource, we need to work around limitations
    // We'll use a different approach - send POST request and get stream URL
    const url = `${this.baseUrl}/api/chat`;

    // Create a temporary EventSource-compatible stream
    // Since EventSource doesn't support POST, we'll use fetch with streaming
    return new EventSource(url, {
      withCredentials: false,
    });
  }

  /**
   * Send a chat message using fetch API with streaming response.
   * Returns an async generator of StreamEvents.
   */
  async *streamChat(sessionId: string, message: string): AsyncGenerator<any> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId, message }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const event = JSON.parse(data);
              yield event;
            } catch (e) {
              console.error('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export const apiService = new ApiService();
