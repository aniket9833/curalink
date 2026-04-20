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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleWelcomeSend = (query, ctx) => {
    if (ctx && Object.keys(ctx).length > 0) {
      setMedicalContext(ctx);
    }

    sendMessage(query, ctx && Object.keys(ctx).length > 0 ? ctx : null);
  };

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

  return (
    <div className="app">
      {/* LEFT SIDEBAR */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onNewChat={newChat}
        onLoadChat={loadChat}
        onDeleteChat={deleteChat}
        huggingFaceStatus={huggingFaceStatus}
      />

      {/* MAIN */}
      <main className="main">
        {/* HEADER */}
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

            {/* {currentChatId && (
              <button className="icon-btn" onClick={newChat} title="New Chat">
                <Trash2 size={14} />
              </button>
            )} */}
          </div>
        </div>

        {/* CHAT AREA */}
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

        {/* INPUT */}
        <ChatInput
          onSend={(msg) => sendMessage(msg)}
          isLoading={isLoading}
          disabled={false}
        />
      </main>

      {/* RIGHT CONTEXT PANEL (always visible desktop) */}
      <ContextPanel
        medicalContext={medicalContext}
        lastQueryInfo={lastQueryInfo}
      />
    </div>
  );
}
