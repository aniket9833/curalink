import React from 'react';
import { Bot } from 'lucide-react';

export default function TypingIndicator({ step }) {
  return (
    <div className="typing-indicator">
      <div className="message-avatar ai">
        <Bot size={16} />
      </div>
      <div>
        <div className="typing-dots">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
        {step && (
          <div className="typing-label">
            <span className="pipeline-step">{step}</span>
          </div>
        )}
      </div>
    </div>
  );
}
