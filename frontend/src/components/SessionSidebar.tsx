import { useEffect, useState } from 'react';
import type { Session } from '../types';
import { apiService } from '../services/api';
import './SessionSidebar.css';

interface SessionSidebarProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
}

export const SessionSidebar = ({
  currentSessionId,
  onSessionSelect,
  onNewSession,
}: SessionSidebarProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const fetchedSessions = await apiService.listSessions();
      setSessions(fetchedSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    // Refresh sessions every 10 seconds
    const interval = setInterval(loadSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this session?')) {
      try {
        await apiService.deleteSession(sessionId);
        await loadSessions();
        if (currentSessionId === sessionId) {
          onNewSession();
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="session-sidebar">
      <div className="sidebar-header">
        <h2>Sessions</h2>
        <button onClick={onNewSession} className="new-session-btn">
          + New
        </button>
      </div>

      <div className="session-list">
        {loading && sessions.length === 0 && (
          <div className="loading">Loading...</div>
        )}

        {sessions.length === 0 && !loading && (
          <div className="empty-sessions">
            No sessions yet. Create one to start chatting!
          </div>
        )}

        {sessions.map((session) => (
          <div
            key={session.session_id}
            className={`session-item ${
              session.session_id === currentSessionId ? 'active' : ''
            }`}
            onClick={() => onSessionSelect(session.session_id)}
          >
            <div className="session-info">
              <div className="session-title">
                Session {session.session_id.slice(0, 8)}
              </div>
              <div className="session-meta">
                <span>{session.message_count} messages</span>
                <span>•</span>
                <span>{formatDate(session.last_activity)}</span>
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(session.session_id, e)}
              className="delete-btn"
              title="Delete session"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
