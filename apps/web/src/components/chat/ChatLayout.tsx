import type { ReactNode } from 'react';

interface ChatLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  rightSidebar?: ReactNode;
}

export function ChatLayout({ sidebar, children, rightSidebar }: ChatLayoutProps) {
  return (
    <div className="flex h-screen bg-white">
      <aside className="w-[300px] border-r border-gray-200 flex flex-col">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      {rightSidebar && (
        <aside className="border-l border-gray-200 flex flex-col">
          {rightSidebar}
        </aside>
      )}
    </div>
  );
}
