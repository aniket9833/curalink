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
    huggingFaceStatus,
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

  const showWelcome = messages.length === 0 && !isLoading;

  // Auto scroll
  const prevLength = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevLength.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    }

    prevLength.current = messages.length;
  }, [messages]);

  // Welcome screen send
  const handleWelcomeSend = (query, ctx) => {
    if (ctx && Object.keys(ctx).length > 0) {
      setMedicalContext(ctx);
    }

    sendMessage(query, ctx && Object.keys(ctx).length > 0 ? ctx : null);
  };

  // Export PDF
  const handleExportAll = () => {
    const lastAI = [...messages].reverse().find((m) => m.role === 'assistant');

    if (lastAI) {
      exportResponseToPDF(
        {
          ...lastAI,
          userQuery: chatTitle,
        },
        chatTitle,
      );
    }
  };

  const handleNewChat = () => {
    newChat();
  };

  return (
    <div className="app">
      {/* Sidebar always visible */}
      <div className="sidebar-shell">
        <Sidebar
          chats={chats}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onLoadChat={loadChat}
          onDeleteChat={deleteChat}
          huggingFaceStatus={huggingFaceStatus}
        />
      </div>

      {/* Main */}
      <main className="main">
        {/* Header */}
        <div className="chat-header">
          <div className="header-leading">
            <span className="chat-header-title">
              {showWelcome ? 'Welcome to Curalink' : chatTitle}
            </span>
          </div>

          <div className="header-actions">
            {!showWelcome && messages.some((m) => m.role === 'assistant') && (
              <button
                className="export-btn"
                onClick={handleExportAll}
                title="Export session to PDF"
              >
                <Download size={14} />
                Export PDF
              </button>
            )}

            {currentChatId && (
              <button
                className="icon-btn"
                onClick={handleNewChat}
                title="New Chat"
              >
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
                <Message
                  key={msg.id}
                  message={msg}
                  chatTitle={chatTitle}
                  onFollowUpSend={(question) => sendMessage(question)}
                />
              ))}

              {isLoading && <TypingIndicator step={pipelineStep} />}

              {error && (
                <div className="error-msg">
                  ⚠️ {error}
                  {error.includes('Hugging Face') && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: '0.8rem',
                        opacity: 0.8,
                      }}
                    >
                      Ensure{' '}
                      <code
                        style={{
                          background: 'rgba(251,113,133,0.15)',
                          padding: '1px 6px',
                          borderRadius: 3,
                        }}
                      >
                        HF_TOKEN
                      </code>{' '}
                      environment variable is set
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

      {/* Context panel always visible */}
      <div className="context-shell">
        <ContextPanel
          medicalContext={medicalContext}
          lastQueryInfo={lastQueryInfo}
        />
      </div>
    </div>
  );
}
