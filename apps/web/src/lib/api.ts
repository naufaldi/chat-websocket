import axios from 'axios';
import type { LoginInput, RegisterInput, UserResponse, AuthResponse } from '@chat/shared/schemas/auth';
import {
  conversationsListResponseSchema,
  conversationDetailSchema,
  conversationCreatedSchema,
} from '@chat/shared/schemas/conversation';
import type {
  ConversationDetail,
  ConversationCreated,
  CreateConversationInput,
} from '@chat/shared/schemas/conversation';
import { userSearchResponseSchema, userSchema } from '@chat/shared/schemas/user';
import { privacySettingsSchema } from '@chat/shared/schemas/user';
import type { UpdateProfileInput, PrivacySettings, User } from '@chat/shared/schemas/user';
import { messagesListResponseSchema, messageSchema } from '@chat/shared/schemas/message';
import type { ConversationsQueryResponse } from '@/types/conversation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Track refresh attempts globally to prevent infinite loops
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

// Auth endpoints that don't require token refresh on 401
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];
const NO_RETRY_ENDPOINTS = ['/auth/me']; // Endpoints that should not retry with refresh

const isAuthEndpoint = (url: string) => AUTH_ENDPOINTS.some(endpoint => url.includes(endpoint));
const isNoRetryEndpoint = (url: string) => NO_RETRY_ENDPOINTS.some(endpoint => url.includes(endpoint));

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip if already retried or if this is an auth endpoint (login/register/refresh)
    if (!originalRequest || originalRequest._retry || isAuthEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      originalRequest._retry = true;

      // For /auth/me endpoint, don't try to refresh - clear tokens immediately
      if (isNoRetryEndpoint(originalRequest.url)) {
        handleAuthFailure();
        return Promise.reject(error);
      }

      // Check if we should try to refresh (max 3 attempts)
      if (refreshAttempts < MAX_REFRESH_ATTEMPTS) {
        refreshAttempts++;

        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          // No refresh token - clear tokens, notify app, and reject
          refreshAttempts = 0;
          handleAuthFailure();
          return Promise.reject(error);
        }

        try {
          // Use plain axios to avoid interceptor loop
          // Send refresh_token in body (not auth header)
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Reset refresh counter after successful refresh
          refreshAttempts = 0;

          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens, notify app, and reject
          refreshAttempts = 0;
          handleAuthFailure();
          return Promise.reject(refreshError);
        }
      } else {
        // Max refresh attempts reached - clear tokens, notify app, and reject
        refreshAttempts = 0;
        handleAuthFailure();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API functions - reusable by hooks
export const authApi = {
  register: (data: RegisterInput) => api.post<AuthResponse>('/auth/register', data),
  login: (data: LoginInput) => api.post<AuthResponse>('/auth/login', data),
  getMe: () => api.get<UserResponse>('/auth/me'),
  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

// Conversation API functions
export const conversationsApi = {
  list: async (cursor?: string, limit = 50): Promise<ConversationsQueryResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(limit));
    const response = await api.get('/conversations', { params });
    return conversationsListResponseSchema.parse(response.data);
  },

  get: async (id: string): Promise<ConversationDetail> => {
    const response = await api.get(`/conversations/${id}`);
    return conversationDetailSchema.parse(response.data);
  },

  create: async (data: CreateConversationInput): Promise<ConversationCreated> => {
    const response = await api.post('/conversations', data);
    return conversationCreatedSchema.parse(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}`);
  },

  leave: async (id: string): Promise<void> => {
    await api.delete(`/conversations/${id}/leave`);
  },

  listMessages: async (id: string, cursor?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(limit));
    const response = await api.get(`/conversations/${id}/messages`, { params });
    return messagesListResponseSchema.parse(response.data);
  },

  sendMessage: async (conversationId: string, data: {
    content: string;
    contentType: 'text';
    clientMessageId: string;
    replyToId?: string;
  }) => {
    const response = await api.post(`/conversations/${conversationId}/messages`, data);
    return messageSchema.parse(response.data);
  },

  deleteMessage: async (conversationId: string, messageId: string): Promise<void> => {
    await api.delete(`/conversations/${conversationId}/messages/${messageId}`);
  },
};

export const usersApi = {
  search: async (query: string, limit = 20) => {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('limit', String(limit));
    const response = await api.get('/users/search', { params });
    return userSearchResponseSchema.parse(response.data);
  },

  updateProfile: async (data: UpdateProfileInput): Promise<User> => {
    const response = await api.patch('/users/me', data);
    return userSchema.parse(response.data);
  },

  updatePrivacy: async (data: PrivacySettings): Promise<PrivacySettings> => {
    const response = await api.patch('/users/me/privacy', data);
    return privacySettingsSchema.parse(response.data);
  },
};

// Helper to set auth tokens (access + refresh)
export const setAuthToken = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

// Helper to clear auth tokens
export const clearAuthToken = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Custom event for auth failure - dispatches when token refresh fails
export const AUTH_AUTHENTICATION_FAILED_EVENT = 'auth:authentication-failed';

// Handle auth failure - clears tokens and notifies app to redirect
export function handleAuthFailure() {
  clearAuthToken();
  window.dispatchEvent(new CustomEvent(AUTH_AUTHENTICATION_FAILED_EVENT));
}

// Helper to get auth token
export const getAuthToken = () => localStorage.getItem('accessToken');

// Rate limit error types
export interface RateLimitError {
  isRateLimited: boolean;
  message: string;
  retryAfter?: number; // seconds
}

// Extract rate limit error information from axios error
export function extractRateLimitError(error: unknown): RateLimitError {
  const axiosError = error as { response?: { status?: number; headers?: { 'retry-after'?: string } } };

  if (axiosError.response?.status === 429) {
    const retryAfterHeader = axiosError.response.headers?.['retry-after'];
    let retryAfter: number | undefined;

    if (retryAfterHeader) {
      // Try to parse as seconds (number) or as HTTP date
      const parsed = parseInt(retryAfterHeader, 10);
      retryAfter = isNaN(parsed) ? undefined : parsed;
    }

    return {
      isRateLimited: true,
      message: retryAfter
        ? `Too many attempts. Please try again in ${formatRetryTime(retryAfter)}.`
        : 'Too many attempts. Please try again later.',
      retryAfter,
    };
  }

  return {
    isRateLimited: false,
    message: '',
  };
}

// Format retry time for display
function formatRetryTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

// Format remaining time for display (for use in components)
export function formatRemainingTime(seconds: number): string {
  return formatRetryTime(seconds);
}
