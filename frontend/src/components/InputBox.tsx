import { useState, type KeyboardEvent } from 'react';
import './InputBox.css';

interface InputBoxProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export const InputBox = ({ onSend, disabled }: InputBoxProps) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-box">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? 'Waiting for response...' : 'Type your message... (Shift+Enter for new line)'}
        disabled={disabled}
        rows={1}
        className="input-textarea"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="send-button"
      >
        Send
      </button>
    </div>
  );
};
