import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSettings,
  useUpdateProfileSettings,
  useUpdatePrivacySettings,
  useUpdateNotificationSettings,
  useChangePassword,
  getSettingsErrorMessage,
  settingsKeys,
} from './useSettings';
import { settingsApi } from '@/lib/api';
import type { SettingsResponse } from '@chat/shared/schemas/settings';

// Mock the API module
vi.mock('@/lib/api', () => ({
  settingsApi: {
    getSettings: vi.fn(),
    updateProfile: vi.fn(),
    updatePrivacy: vi.fn(),
    updateNotifications: vi.fn(),
    changePassword: vi.fn(),
    subscribePush: vi.fn(),
  },
  parseApiError: vi.fn(),
}));

// Mock data
const mockSettings: SettingsResponse = {
  displayName: 'Test User',
  avatarUrl: null,
  profilePhotoVisibility: 'everyone',
  presenceEnabled: true,
  presenceSharing: 'everyone',
  readReceiptsEnabled: true,
  pushNotificationsEnabled: false,
  email: 'test@example.com',
  username: 'testuser',
};

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('settingsKeys', () => {
    it('should have correct query key structure', () => {
      expect(settingsKeys.all).toEqual(['settings']);
      expect(settingsKeys.detail()).toEqual(['settings', 'detail']);
    });
  });

  describe('useSettings hook', () => {
    it('should fetch settings successfully', async () => {
      vi.mocked(settingsApi.getSettings).mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockSettings);
      expect(settingsApi.getSettings).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      vi.mocked(settingsApi.getSettings).mockRejectedValue(error);

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useUpdateProfileSettings', () => {
    it('should update profile settings optimistically', async () => {
      vi.mocked(settingsApi.getSettings).mockResolvedValue(mockSettings);
      vi.mocked(settingsApi.updateProfile).mockResolvedValue({
        ...mockSettings,
        displayName: 'Updated Name',
      });

      const { result: settingsResult } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));

      const { result: mutationResult } = renderHook(
        () => useUpdateProfileSettings(),
        { wrapper: createWrapper() }
      );

      mutationResult.current.mutate({ displayName: 'Updated Name' });

      await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

      expect(settingsApi.updateProfile).toHaveBeenCalledWith(
        { displayName: 'Updated Name' },
        expect.anything()
      );
    });

    it('should rollback on error', async () => {
      vi.mocked(settingsApi.getSettings).mockResolvedValue(mockSettings);
      vi.mocked(settingsApi.updateProfile).mockRejectedValue(new Error('Update failed'));

      const { result: mutationResult } = renderHook(
        () => useUpdateProfileSettings(),
        { wrapper: createWrapper() }
      );

      mutationResult.current.mutate({ displayName: 'Updated Name' });

      await waitFor(() => expect(mutationResult.current.isError).toBe(true));
    });
  });

  describe('useUpdatePrivacySettings', () => {
    it('should update privacy settings', async () => {
      vi.mocked(settingsApi.updatePrivacy).mockResolvedValue({
        ...mockSettings,
        presenceEnabled: false,
      });

      const { result } = renderHook(() => useUpdatePrivacySettings(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ presenceEnabled: false });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(settingsApi.updatePrivacy).toHaveBeenCalledWith(
        { presenceEnabled: false },
        expect.anything()
      );
    });
  });

  describe('useUpdateNotificationSettings', () => {
    it('should update notification settings', async () => {
      vi.mocked(settingsApi.updateNotifications).mockResolvedValue({
        ...mockSettings,
        pushNotificationsEnabled: true,
      });

      const { result } = renderHook(() => useUpdateNotificationSettings(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ pushNotificationsEnabled: true });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(settingsApi.updateNotifications).toHaveBeenCalledWith(
        { pushNotificationsEnabled: true },
        expect.anything()
      );
    });
  });

  describe('useChangePassword', () => {
    it('should change password successfully', async () => {
      vi.mocked(settingsApi.changePassword).mockResolvedValue(undefined);

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        currentPassword: 'oldpassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(settingsApi.changePassword).toHaveBeenCalledWith(
        {
          currentPassword: 'oldpassword123',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        },
        expect.anything()
      );
    });

    it('should handle password change error', async () => {
      vi.mocked(settingsApi.changePassword).mockRejectedValue(
        new Error('Current password is incorrect')
      );

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        currentPassword: 'wrongpassword',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('getSettingsErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Something went wrong');
      expect(getSettingsErrorMessage(error)).toBe('Something went wrong');
    });

    it('should return default message for unknown error', () => {
      expect(getSettingsErrorMessage('string error')).toBe('An unexpected error occurred');
    });

    it('should handle API error response', () => {
      const apiError = {
        response: {
          data: {
            statusCode: 400,
            message: 'Validation failed',
            errors: [{ field: 'displayName', message: 'Name is required' }],
          },
        },
      };

      // The parseApiError mock will be called
      expect(getSettingsErrorMessage(apiError)).toBe('An unexpected error occurred');
    });
  });
});
