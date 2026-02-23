import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect } from 'react';
import { authApi, setAuthToken, clearAuthToken, handleAuthFailure } from '../lib/api';
import type { LoginInput, RegisterInput, UserResponse, AuthResponse } from '@chat/shared/schemas/auth';
import { useAuthContext } from '../contexts/AuthContext';

// Query keys for cache management
export const authKeys = {
  me: ['auth', 'me'] as const,
};

// Hook for fetching current user
export function useCurrentUser() {
  // Only run query if token exists in localStorage
  const hasToken = !!localStorage.getItem('accessToken');

  const query = useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.getMe().then((res) => res.data),
    retry: 0, // Don't retry on 401 - let interceptor handle it
    retryDelay: 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: hasToken, // Only fetch if token exists
  });

  // Handle 401 errors by clearing tokens and triggering redirect
  useEffect(() => {
    if (query.error) {
      const axiosError = query.error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        handleAuthFailure();
      }
    }
  }, [query.error]);

  return query;
}

// Hook for login mutation
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data).then((res) => res.data),
    onSuccess: (data: AuthResponse) => {
      setAuthToken(data.accessToken, data.refreshToken);
      queryClient.setQueryData<UserResponse>(authKeys.me, data.user);
    },
  });
}

// Hook for register mutation
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data).then((res) => res.data),
    onSuccess: (data: AuthResponse) => {
      setAuthToken(data.accessToken, data.refreshToken);
      queryClient.setQueryData<UserResponse>(authKeys.me, data.user);
    },
  });
}

// Hook for logout
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      // Call logout endpoint (may fail if backend not implemented)
      await authApi.logout();
    } catch {
      // Ignore errors - logout should work even if endpoint fails
    } finally {
      // Always clear tokens and redirect
      clearAuthToken();
      queryClient.clear();
      navigate('/login', { replace: true });
    }
  }, [navigate, queryClient]);
}

// Hook for refreshing token
export function useRefreshToken() {
  return useMutation({
    mutationFn: () => authApi.refresh().then((res) => res.data),
  });
}

// Convenience hook for using auth context
export function useAuth() {
  return useAuthContext();
}
