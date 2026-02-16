import axios from 'axios';
import type { LoginInput, RegisterInput, UserResponse, AuthResponse } from '@chat/shared/schemas/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Track refresh attempts globally to prevent infinite loops
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

const isRefreshRequest = (url: string) => url.includes('/auth/refresh');

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

    // Skip if already retried or if this is a refresh request
    if (originalRequest._retry || isRefreshRequest(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      originalRequest._retry = true;

      // Check if we should try to refresh (max 3 attempts)
      if (refreshAttempts < MAX_REFRESH_ATTEMPTS) {
        refreshAttempts++;

        try {
          // Use the authApi directly without interceptors to avoid infinite loop
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Reset refresh counter after successful refresh
          refreshAttempts = 0;

          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          refreshAttempts = 0;
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // Max refresh attempts reached - redirect to login
        refreshAttempts = 0;
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
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
};

// Helper to set auth token
export const setAuthToken = (token: string) => {
  localStorage.setItem('accessToken', token);
};

// Helper to clear auth token
export const clearAuthToken = () => {
  localStorage.removeItem('accessToken');
};

// Helper to get auth token
export const getAuthToken = () => localStorage.getItem('accessToken');
