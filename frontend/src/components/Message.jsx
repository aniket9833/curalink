import ReactMarkdown from 'react-markdown';
import { Download, Bot, User, Zap } from 'lucide-react';
import SourcesPanel from './SourcesPanel';
import { exportResponseToPDF } from '../utils/exportPDF';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RetrievalStats({ stats }) {
  if (!stats) return null;
  return (
    <div className="retrieval-stats">
      {stats.pubmedCount > 0 && (
        <div className="stat-chip pubmed">
          <div className="dot" />
          PubMed: {stats.pubmedCount}
        </div>
      )}
      {stats.openAlexCount > 0 && (
        <div className="stat-chip openalex">
          <div className="dot" />
          OpenAlex: {stats.openAlexCount}
        </div>
      )}
      {stats.trialsCount > 0 && (
        <div className="stat-chip trials">
          <div className="dot" />
          Trials: {stats.trialsCount}
        </div>
      )}
      {stats.rankedCount > 0 && (
        <div
          className="stat-chip"
          style={{
            color: 'var(--accent-purple)',
            borderColor: 'rgba(167,139,250,0.2)',
          }}
        >
          <div className="dot" style={{ background: 'var(--accent-purple)' }} />
          Top {stats.rankedCount} ranked
        </div>
      )}
    </div>
  );
}

function FollowUpQuestions({ questions, onSend }) {
  if (!questions?.length || !onSend) return null;

  return (
    <div className="follow-up-panel">
      <div className="follow-up-label">Suggested follow-up questions</div>
      <div className="follow-up-list">
        {questions.map((question) => (
          <button
            key={question}
            className="follow-up-chip"
            onClick={() => onSend(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Message({ message, chatTitle, onFollowUpSend }) {
  const isUser = message.role === 'user';

  const handleExport = () => {
    exportResponseToPDF(
      { ...message, userQuery: message.userQuery },
      chatTitle,
    );
  };

  return (
    <div className={`message ${isUser ? 'user' : ''}`}>
      <div className={`message-avatar ${isUser ? 'user-av' : 'ai'}`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className="message-body">
        <div className={`message-bubble ${isUser ? 'user' : 'ai'}`}>
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <ReactMarkdown
              components={{
                h2: ({ children }) => <h2>{children}</h2>,
                h3: ({ children }) => <h3>{children}</h3>,
                p: ({ children }) => <p>{children}</p>,
                strong: ({ children }) => <strong>{children}</strong>,
                ul: ({ children }) => <ul>{children}</ul>,
                ol: ({ children }) => <ol>{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                code: ({ children }) => <code>{children}</code>,
                blockquote: ({ children }) => (
                  <blockquote>{children}</blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && (
          <>
            <RetrievalStats stats={message.retrievalStats} />

            {message.queryExpanded && (
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Zap
                  size={10}
                  style={{ color: 'var(--accent-warning)', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Expanded: {message.queryExpanded.slice(0, 100)}
                  {message.queryExpanded.length > 100 ? '…' : ''}
                </span>
              </div>
            )}

            <SourcesPanel
              sources={message.sources}
              retrievalStats={message.retrievalStats}
            />

            <FollowUpQuestions
              questions={message.followUpQuestions}
              onSend={onFollowUpSend}
            />
          </>
        )}

        <div className="message-meta">
          <span className="message-time">{formatTime(message.timestamp)}</span>
          {!isUser && message.model && (
            <span
              className={`model-badge ${message.aiAvailable === false ? 'fallback-badge' : ''}`}
            >
              {message.aiAvailable === false
                ? '⚠ fallback'
                : `⚡ ${message.model}`}
            </span>
          )}
          {!isUser && (
            <button
              onClick={handleExport}
              title="Export to PDF"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 4,
                background: 'rgba(56,189,248,0.06)',
                border: '1px solid rgba(56,189,248,0.15)',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(56,189,248,0.14)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'rgba(56,189,248,0.06)')
              }
            >
              <Download size={10} /> Export PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
