import React, { useRef, useEffect } from 'react';
import { Download, Trash2 } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Message from './components/Message';
import TypingIndicator from './components/TypingIndicator';
import WelcomeScreen from './components/WelcomeScreen';
import ChatInput from './components/ChatInput';
import ContextPanel from './components/ContextPanel';
import { useChat } from './hooks/useChat';
import { exportResponseToPDF } from './utils/exportPDF';
import './styles/global.css';

export default function App() {
  const {
    chats,
    currentChatId,
    messages,
    isLoading,
    pipelineStep,
    error,
    ollamaStatus,
    medicalContext,
    setMedicalContext,
    lastQueryInfo,
    sendMessage,
    loadChat,
    newChat,
    deleteChat,
  } = useChat();

  const messagesEndRef = useRef(null);
  const chatTitle =
    messages.find((m) => m.role === 'user')?.content.slice(0, 60) ||
    'Research Session';
  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle welcome screen send (with context)
  const handleWelcomeSend = (query, ctx) => {
    if (ctx && Object.keys(ctx).length > 0) {
      setMedicalContext(ctx);
    }
    sendMessage(query, ctx && Object.keys(ctx).length > 0 ? ctx : null);
  };

  // Export all AI responses as one PDF
  const handleExportAll = () => {
    const lastAI = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAI)
      exportResponseToPDF({ ...lastAI, userQuery: chatTitle }, chatTitle);
  };

  const showWelcome = messages.length === 0 && !isLoading;

  return (
    <div className="app">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={newChat}
        onLoadChat={loadChat}
        onDeleteChat={deleteChat}
        ollamaStatus={ollamaStatus}
      />

      <main className="main">
        {/* Header */}
        <div className="chat-header">
          <span className="chat-header-title">
            {showWelcome ? 'Welcome to Curalink' : chatTitle}
          </span>
          <div className="header-actions">
            {!showWelcome && messages.some((m) => m.role === 'assistant') && (
              <button
                className="export-btn"
                onClick={handleExportAll}
                title="Export session to PDF"
              >
                <Download size={14} /> Export PDF
              </button>
            )}
            {currentChatId && (
              <button className="icon-btn" onClick={newChat} title="New chat">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          {showWelcome ? (
            <WelcomeScreen
              onSend={handleWelcomeSend}
              onContextSave={setMedicalContext}
            />
          ) : (
            <>
              {messages.map((msg) => (
                <Message key={msg.id} message={msg} chatTitle={chatTitle} />
              ))}

              {isLoading && <TypingIndicator step={pipelineStep} />}

              {error && (
                <div className="error-msg">
                  ⚠️ {error}
                  {error.includes('Ollama') && (
                    <div
                      style={{ marginTop: 6, fontSize: '0.8rem', opacity: 0.8 }}
                    >
                      Run:{' '}
                      <code
                        style={{
                          background: 'rgba(251,113,133,0.15)',
                          padding: '1px 6px',
                          borderRadius: 3,
                        }}
                      >
                        ollama serve
                      </code>{' '}
                      and{' '}
                      <code
                        style={{
                          background: 'rgba(251,113,133,0.15)',
                          padding: '1px 6px',
                          borderRadius: 3,
                        }}
                      >
                        ollama pull llama3.2
                      </code>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={(msg) => sendMessage(msg)}
          isLoading={isLoading}
          disabled={false}
        />
      </main>

      <ContextPanel
        medicalContext={medicalContext}
        lastQueryInfo={lastQueryInfo}
      />
    </div>
  );
}
