import React, { useRef, useEffect, useState } from 'react';
import { Download, Menu, PanelRightOpen, Trash2, X } from 'lucide-react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
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
  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const closeMobilePanels = () => {
    setIsSidebarOpen(false);
    setIsContextOpen(false);
  };

  const handleNewChat = () => {
    closeMobilePanels();
    newChat();
  };

  const handleLoadChat = (chatId) => {
    closeMobilePanels();
    loadChat(chatId);
  };

  const handleDeleteChat = (chatId) => {
    closeMobilePanels();
    deleteChat(chatId);
  };

  // Handle welcome screen send (with context)
  const handleWelcomeSend = (query, ctx) => {
    closeMobilePanels();
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
      <div
        className={`mobile-overlay ${isSidebarOpen || isContextOpen ? 'visible' : ''}`}
        onClick={() => {
          setIsSidebarOpen(false);
          setIsContextOpen(false);
        }}
      />

      <div className={`sidebar-shell ${isSidebarOpen ? 'open' : ''}`}>
        <div className="drawer-header mobile-only">
          <span className="drawer-title">Sessions</span>
          <button
            className="icon-btn"
            onClick={() => setIsSidebarOpen(false)}
            title="Close sessions"
          >
            <X size={14} />
          </button>
        </div>
        <Sidebar
          chats={chats}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          huggingFaceStatus={huggingFaceStatus}
        />
      </div>

      <main className="main">
        {/* Header */}
        <div className="chat-header">
          <div className="header-leading">
            <button
              className="icon-btn mobile-only"
              onClick={() => setIsSidebarOpen(true)}
              title="Open sessions"
            >
              <Menu size={16} />
            </button>
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
                <Download size={14} /> Export PDF
              </button>
            )}
            {currentChatId && (
              <button
                className="icon-btn"
                onClick={handleNewChat}
                title="New chat"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              className="icon-btn mobile-only"
              onClick={() => setIsContextOpen(true)}
              title="Open context"
            >
              <PanelRightOpen size={16} />
            </button>
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
                  onFollowUpSend={(question) => {
                    closeMobilePanels();
                    sendMessage(question);
                  }}
                />
              ))}

              {isLoading && <TypingIndicator step={pipelineStep} />}

              {error && (
                <div className="error-msg">
                  ⚠️ {error}
                  {error.includes('Hugging Face') && (
                    <div
                      style={{ marginTop: 6, fontSize: '0.8rem', opacity: 0.8 }}
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
          onSend={(msg) => {
            closeMobilePanels();
            sendMessage(msg);
          }}
          isLoading={isLoading}
          disabled={false}
        />
      </main>

      <div className={`context-shell ${isContextOpen ? 'open' : ''}`}>
        <div className="drawer-header mobile-only">
          <span className="drawer-title">Research Context</span>
          <button
            className="icon-btn"
            onClick={() => setIsContextOpen(false)}
            title="Close context"
          >
            <X size={14} />
          </button>
        </div>
        <ContextPanel
          medicalContext={medicalContext}
          lastQueryInfo={lastQueryInfo}
        />
      </div>
    </div>
  );
}
