import { ChatLayout } from '@/components/chat/ChatLayout';

export function ChatPagePlaceholder() {
  return (
    <ChatLayout sidebar={<div className="p-4">Sidebar</div>}>
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">💬</div>
          <p>Select a conversation to start chatting</p>
        </div>
      </div>
    </ChatLayout>
  );
}
