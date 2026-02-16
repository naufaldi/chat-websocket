import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, setAuthToken, clearAuthToken } from '../lib/api';
import type { LoginInput, RegisterInput, UserResponse, AuthResponse } from '@chat/shared/schemas/auth';
import { useAuthContext } from '../contexts/AuthContext';

// Query keys for cache management
export const authKeys = {
  me: ['auth', 'me'] as const,
};

// Hook for fetching current user
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.getMe().then((res) => res.data),
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for login mutation
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data).then((res) => res.data),
    onSuccess: (data: AuthResponse) => {
      setAuthToken(data.accessToken);
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
      setAuthToken(data.accessToken);
      queryClient.setQueryData<UserResponse>(authKeys.me, data.user);
    },
  });
}

// Hook for logout
export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    clearAuthToken();
    queryClient.clear();
  };
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
