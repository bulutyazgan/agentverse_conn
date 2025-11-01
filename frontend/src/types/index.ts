export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tools_used?: string[];
}

export interface Session {
  session_id: string;
  created_at: string;
  last_activity: string;
  message_count: number;
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
