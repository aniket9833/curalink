import React from 'react';
import {
  PlusCircle,
  MessageSquare,
  Trash2,
  Activity,
  FlaskConical,
} from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Sidebar({
  chats,
  currentChatId,
  onNewChat,
  onLoadChat,
  onDeleteChat,
  ollamaStatus,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <FlaskConical size={18} color="#060c1a" strokeWidth={2.5} />
          </div>
          <div>
            <div className="logo-text">Curalink</div>
            <div className="logo-tagline">Medical Research AI</div>
          </div>
        </div>

        <button className="new-chat-btn" onClick={onNewChat}>
          <PlusCircle size={15} />
          New Research Session
        </button>
      </div>

      <div className="chat-list">
        <div className="sidebar-section">
          <div className="sidebar-section-label">Recent Sessions</div>

          {chats.length === 0 && (
            <div
              style={{
                padding: '12px 20px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}
            >
              No sessions yet. Start a new one!
            </div>
          )}

          {chats.map((chat) => (
            <div
              key={chat._id}
              className={`chat-item ${currentChatId === chat._id ? 'active' : ''}`}
              onClick={() => onLoadChat(chat._id)}
            >
              <MessageSquare
                size={13}
                style={{ flexShrink: 0, color: 'var(--text-muted)' }}
              />
              <span className="chat-item-title">{chat.title}</span>
              <span className="chat-item-date">
                {formatDate(chat.updatedAt)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat._id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                  display: 'flex',
                  opacity: 0,
                  transition: 'var(--transition)',
                }}
                className="delete-chat-btn"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <div
          className={`status-badge ${ollamaStatus?.available ? 'online' : 'offline'}`}
        >
          <div className="status-dot" />
          <Activity size={11} />
          {ollamaStatus?.available
            ? `AI: ${ollamaStatus.currentModel || 'llama3.2'}`
            : 'AI Offline — Start Ollama'}
        </div>
      </div>

      <style>{`
        .chat-item:hover .delete-chat-btn { opacity: 1 !important; }
      `}</style>
    </aside>
  );
}
