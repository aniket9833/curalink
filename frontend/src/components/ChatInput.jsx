import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader } from 'lucide-react';

export default function ChatInput({ onSend, isLoading, disabled }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-area">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about diseases, treatments, clinical trials…"
          rows={1}
          disabled={disabled || isLoading}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          title="Send (Enter)"
        >
          {isLoading ? (
            <Loader
              size={16}
              style={{ animation: 'spin 0.8s linear infinite' }}
            />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
      <div className="input-hints">
        <span className="hint-text">
          Enter to send · Shift+Enter for new line · Sources auto-attached
        </span>
        <span className="char-count">{text.length}</span>
      </div>
    </div>
  );
}
