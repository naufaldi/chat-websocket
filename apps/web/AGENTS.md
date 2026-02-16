# AGENTS.md - Frontend Developer Guide

> See root `AGENTS.md` for monorepo overview and superpowers skills.

## Domain Skills

For this frontend codebase, prioritize:
- `vercel-react-best-practices` - React/Next.js performance
- `frontend-design` - UI/UX patterns
- `writing-react-effects` - Effect patterns

## Commands

```bash
# Development
bun run dev

# Production build
bun run build

# Preview build
bun run preview

# Type check
bun run typecheck

# Lint
bun run lint

# Bun-specific
bunx vite
bunx tailwindcss
```

## Tech Stack

- **Framework**: React 19.x + Vite 7.x
- **Styling**: Tailwind CSS 4.x (CSS-based config)
- **Data Fetching**: TanStack Query 5.x
- **Routing**: React Router DOM 7.x
- **WebSocket**: socket.io-client 4.x
- **Validation**: Zod 4.x

## Path Alias

```json
{
  "@/*": ["./src/*"]
}
```

Import using: `import { Button } from '@/components/Button';`

## Code Style

### Components

```typescript
// ✅ Good: Functional component with explicit props
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={cn('btn', variant === 'primary' && 'btn-primary')} onClick={onClick}>
      {children}
    </button>
  );
}
```

### TanStack Query

```typescript
// ✅ Good: Custom hook for data fetching
function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    staleTime: 1000 * 60, // 1 minute
  });
}

// ✅ Good: Mutations with optimistic updates
function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: sendMessage,
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ['messages', newMessage.conversationId] });
      const previous = queryClient.getQueryData(['messages', newMessage.conversationId]);
      
      queryClient.setQueryData(['messages', newMessage.conversationId], (old: Message[]) => [
        ...old,
        { ...newMessage, status: 'sending' },
      ]);
      
      return { previous };
    },
    onError: (err, newMessage, context) => {
      queryClient.setQueryData(['messages', newMessage.conversationId], context?.previous);
    },
  });
}
```

### WebSocket

```typescript
// ✅ Good: Centralized socket instance
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('accessToken');
    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3000/chat', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });
  }
  return socket;
}
```

### Tailwind CSS 4.x

```css
/* index.css - use @import */
@import "tailwindcss";

/* Component classes using tailwind-merge */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined)[]) {
  return twMerge(clsx(inputs));
}

/* Usage */
<div className={cn('base-class', isActive && 'active', variant === 'primary' && 'bg-blue-500')} />
```

### Zod Validation

```typescript
// ✅ Good: Define schemas for runtime validation
import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  clientMessageId: z.string().uuid(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
```

## File Structure

```
apps/web/src/
├── components/       # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utilities (api, socket, utils)
├── pages/          # Route pages
├── types/           # TypeScript types
└── App.tsx         # Root component
```
