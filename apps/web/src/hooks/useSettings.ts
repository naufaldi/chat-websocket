import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, parseApiError } from '@/lib/api';
import type {
  SettingsResponse,
  UpdateProfileSettings,
  UpdatePrivacySettings,
  UpdateNotificationSettings,
} from '@chat/shared/schemas/settings';

// Query keys for settings
export const settingsKeys = {
  all: ['settings'] as const,
  detail: () => [...settingsKeys.all, 'detail'] as const,
};

// Hook for fetching user settings
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: settingsApi.getSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for updating profile settings with optimistic updates
export function useUpdateProfileSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateProfile,

    // Optimistic update
    onMutate: async (newProfileData: UpdateProfileSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: settingsKeys.detail() });

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<SettingsResponse>(
        settingsKeys.detail()
      );

      // Optimistically update to new value
      if (previousSettings) {
        queryClient.setQueryData<SettingsResponse>(settingsKeys.detail(), {
          ...previousSettings,
          ...newProfileData,
        });
      }

      // Return context for rollback
      return { previousSettings };
    },

    // Rollback on error
    onError: (_error, _newProfileData, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.detail(), context.previousSettings);
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.detail() });
    },
  });
}

// Hook for updating privacy settings with optimistic updates
export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updatePrivacy,

    onMutate: async (newPrivacyData: UpdatePrivacySettings) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.detail() });

      const previousSettings = queryClient.getQueryData<SettingsResponse>(
        settingsKeys.detail()
      );

      if (previousSettings) {
        queryClient.setQueryData<SettingsResponse>(settingsKeys.detail(), {
          ...previousSettings,
          ...newPrivacyData,
        });
      }

      return { previousSettings };
    },

    onError: (_error, _newPrivacyData, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.detail(), context.previousSettings);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.detail() });
    },
  });
}

// Hook for updating notification settings with optimistic updates
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateNotifications,

    onMutate: async (newNotificationData: UpdateNotificationSettings) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.detail() });

      const previousSettings = queryClient.getQueryData<SettingsResponse>(
        settingsKeys.detail()
      );

      if (previousSettings) {
        queryClient.setQueryData<SettingsResponse>(settingsKeys.detail(), {
          ...previousSettings,
          ...newNotificationData,
        });
      }

      return { previousSettings };
    },

    onError: (_error, _newNotificationData, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsKeys.detail(), context.previousSettings);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.detail() });
    },
  });
}

// Hook for changing password
export function useChangePassword() {
  return useMutation({
    mutationFn: settingsApi.changePassword,
  });
}

// Hook for subscribing to push notifications
export function useSubscribePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.subscribePush,

    onSuccess: () => {
      // Refetch settings to get updated push notification status
      queryClient.invalidateQueries({ queryKey: settingsKeys.detail() });
    },
  });
}

// Helper to extract error message from API error
export function getSettingsErrorMessage(error: unknown): string {
  const apiError = parseApiError(error);
  if (apiError) {
    if (apiError.errors && apiError.errors.length > 0) {
      return apiError.errors.map(e => e.message).join(', ');
    }
    return apiError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
