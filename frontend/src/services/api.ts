const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tools_used?: string[];
}

export interface HealthResponse {
  status: string;
  message_count: number;
}

export interface HistoryResponse {
  messages: Message[];
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  }

  async getHistory(): Promise<Message[]> {
    const response = await fetch(`${this.baseUrl}/api/history`);
    if (!response.ok) throw new Error('Failed to get history');
    const data: HistoryResponse = await response.json();
    return data.messages;
  }

  async clearHistory(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/clear`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to clear history');
  }

  async *streamChat(message: string): AsyncGenerator<any> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

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
              yield JSON.parse(data);
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
