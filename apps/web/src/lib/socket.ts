import {
  clientToServerEventSchemas,
  serverToClientEventSchemas,
  type MessageReceivedEvent,
  type MessageSentEvent,
  type MessageErrorEvent,
  type TypingStartedEvent,
  type TypingStoppedEvent,
} from '@chat/shared/schemas/socket';
import { io, type Socket } from 'socket.io-client';

type ClientEventName = keyof typeof clientToServerEventSchemas;
type ServerEventName = keyof typeof serverToClientEventSchemas;

type ServerEventPayloadMap = {
  'message:received': MessageReceivedEvent;
  'message:sent': MessageSentEvent;
  'message:error': MessageErrorEvent;
  'typing:started': TypingStartedEvent;
  'typing:stopped': TypingStoppedEvent;
};

type DefaultServerPayload = Record<string, unknown>;

export type SocketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

type EventHandler = (payload?: unknown) => void;

interface SocketLike {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, payload: unknown) => void;
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler?: EventHandler) => void;
}

interface CreateChatSocketServiceOptions {
  createSocket?: (url: string, token: string) => SocketLike;
  getToken?: () => string | null;
  namespaceUrl?: string;
}

function resolveNamespaceUrl(): string {
  const envWsUrl = import.meta.env.VITE_WS_URL;
  const envApiUrl = import.meta.env.VITE_API_URL;
  const baseUrl = envWsUrl || envApiUrl || 'http://localhost:3000';
  const normalized = baseUrl.replace(/\/$/, '');
  return normalized.endsWith('/chat') ? normalized : `${normalized}/chat`;
}

function createDefaultSocket(url: string, token: string): SocketLike {
  return io(url, {
    autoConnect: false,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    auth: { token },
    query: { token },
  }) as Socket;
}

export class ChatSocketService {
  private readonly createSocket: (url: string, token: string) => SocketLike;
  private readonly getToken: () => string | null;
  private readonly namespaceUrl: string;
  private socket: SocketLike | null = null;
  private status: SocketConnectionStatus = 'disconnected';
  private statusListeners = new Set<(status: SocketConnectionStatus) => void>();
  private serverListeners = new Map<ServerEventName, Set<EventHandler>>();

  constructor(options: CreateChatSocketServiceOptions = {}) {
    this.createSocket = options.createSocket ?? createDefaultSocket;
    this.getToken = options.getToken ?? (() => localStorage.getItem('accessToken'));
    this.namespaceUrl = options.namespaceUrl ?? resolveNamespaceUrl();
  }

  getStatus(): SocketConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return this.status === 'connected';
  }

  onConnectionStatusChange(listener: (status: SocketConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  connect(tokenOverride?: string): void {
    const token = tokenOverride ?? this.getToken();
    if (!token) {
      return;
    }

    if (!this.socket) {
      this.socket = this.createSocket(this.namespaceUrl, token);
      this.attachLifecycleHandlers(this.socket);
      this.attachServerListeners(this.socket);
    }

    this.setStatus(this.socket.connected ? 'connected' : 'connecting');
    this.socket.connect();
  }

  disconnect(): void {
    if (!this.socket) {
      this.setStatus('disconnected');
      return;
    }

    this.socket.disconnect();
    this.socket = null;
    this.setStatus('disconnected');
  }

  subscribe(conversationId: string): void {
    this.emitValidated('subscribe', { conversationId });
  }

  unsubscribe(conversationId: string): void {
    this.emitValidated('unsubscribe', { conversationId });
  }

  sendMessage(payload: {
    conversationId: string;
    content: string;
    clientMessageId: string;
    replyToId?: string;
  }): void {
    this.emitValidated('message:send', {
      ...payload,
      contentType: 'text',
    });
  }

  typingStart(conversationId: string): void {
    this.emitValidated('typing:start', { conversationId });
  }

  typingStop(conversationId: string): void {
    this.emitValidated('typing:stop', { conversationId });
  }

  on<E extends ServerEventName>(
    event: E,
    handler: (payload: E extends keyof ServerEventPayloadMap ? ServerEventPayloadMap[E] : DefaultServerPayload) => void
  ): () => void {
    if (!this.socket) {
      return () => undefined;
    }

    const schema = serverToClientEventSchemas[event];
    const wrapped: EventHandler = (payload?: unknown) => {
      const result = schema.safeParse(payload);
      if (!result.success) {
        return;
      }
      handler(result.data as E extends keyof ServerEventPayloadMap ? ServerEventPayloadMap[E] : DefaultServerPayload);
    };

    if (!this.serverListeners.has(event)) {
      this.serverListeners.set(event, new Set());
    }
    this.serverListeners.get(event)?.add(wrapped);
    this.socket?.on(event, wrapped);

    return () => {
      this.serverListeners.get(event)?.delete(wrapped);
      this.socket?.off(event, wrapped);
    };
  }

  private emitValidated<E extends ClientEventName>(event: E, payload: unknown): void {
    if (!this.socket) {
      throw new Error('Socket is not connected');
    }

    const schema = clientToServerEventSchemas[event];
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new Error(`Invalid payload for "${event}"`);
    }

    this.socket.emit(event, parsed.data);
  }

  private attachLifecycleHandlers(socket: SocketLike): void {
    socket.on('connect', () => this.setStatus('connected'));
    socket.on('disconnect', () => this.setStatus('disconnected'));
    socket.on('connect_error', () => this.setStatus('reconnecting'));
    socket.on('reconnect_attempt', () => this.setStatus('reconnecting'));
  }

  private attachServerListeners(socket: SocketLike): void {
    this.serverListeners.forEach((handlers, event) => {
      handlers.forEach((handler) => {
        socket.on(event, handler);
      });
    });
  }

  private setStatus(next: SocketConnectionStatus): void {
    if (this.status === next) {
      return;
    }
    this.status = next;
    this.statusListeners.forEach((listener) => listener(next));
  }
}

export function createChatSocketService(options?: CreateChatSocketServiceOptions): ChatSocketService {
  return new ChatSocketService(options);
}

export const chatSocketService = createChatSocketService();
