import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { authKeys } from './useAuth';
import type { UpdateProfileInput, PrivacySettings, User } from '@chat/shared/schemas/user';

// Query keys for user settings
export const userKeys = {
  profile: ['user', 'profile'] as const,
  privacy: ['user', 'privacy'] as const,
};

// Hook for updating user profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileInput) => usersApi.updateProfile(data),
    onSuccess: (updatedUser: User) => {
      // Update both user profile and auth user data
      queryClient.setQueryData(userKeys.profile, updatedUser);
      queryClient.setQueryData(authKeys.me, updatedUser);
    },
  });
}

// Hook for fetching privacy settings
export function usePrivacySettings() {
  return useQuery({
    queryKey: userKeys.privacy,
    queryFn: async () => {
      // For now, we don't have a GET endpoint for privacy settings
      // This will be populated from the user object or we can add a GET endpoint later
      return null;
    },
    enabled: false, // Don't run automatically until we have the endpoint
  });
}

// Hook for updating privacy settings
export function useUpdatePrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PrivacySettings) => usersApi.updatePrivacy(data),
    onSuccess: (data: PrivacySettings) => {
      queryClient.setQueryData(userKeys.privacy, data);
    },
  });
}
