import { useState, type FormEvent } from 'react';
import { Paperclip, Smile, Mic, Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-2">
        <button type="button" className="p-2 hover:bg-gray-100 rounded-full">
          <Paperclip className="w-5 h-5 text-gray-500" />
        </button>
        <button type="button" className="p-2 hover:bg-gray-100 rounded-full">
          <Smile className="w-5 h-5 text-gray-500" />
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {text.trim() ? (
          <button type="submit" className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full text-white">
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button type="button" className="p-2 hover:bg-gray-100 rounded-full">
            <Mic className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>
    </form>
  );
}
