import * as React from 'react';
import { useState, useEffect } from 'react';
import { X, User, AlertCircle } from 'lucide-react';
import {
  useSettings,
  useUpdateProfileSettings,
  getSettingsErrorMessage,
} from '@/hooks/useSettings';
import { profileSettingsSchema } from '@chat/shared/schemas/settings';
import type { UpdateProfileSettings } from '@chat/shared/schemas/settings';
import { AvatarPicker } from './AvatarPicker';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormErrors {
  displayName?: string;
  avatarUrl?: string;
  general?: string;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateProfile = useUpdateProfileSettings();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && settings) {
      // Reset form to current settings
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setDisplayName(settings.displayName);
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setAvatarUrl(settings.avatarUrl);
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setErrors({});
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsSuccess(false);
    }
  }, [isOpen, settings]);

  // Show success message briefly then close
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  // Close on successful update
  useEffect(() => {
    if (updateProfile.isSuccess && !isSuccess) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsSuccess(true);
    }
  }, [updateProfile.isSuccess, isSuccess]);

  const validateForm = (): { isValid: boolean; data: UpdateProfileSettings } => {
    const data: UpdateProfileSettings = {};
    const newErrors: FormErrors = {};

    // Check if display name changed
    if (displayName.trim() !== settings?.displayName) {
      data.displayName = displayName.trim();
    }

    // Check if avatar URL changed
    if (avatarUrl !== settings?.avatarUrl) {
      data.avatarUrl = avatarUrl;
    }

    // If no changes, just close
    if (Object.keys(data).length === 0) {
      return { isValid: true, data: {} };
    }

    // Validate using shared schema
    const result = profileSettingsSchema.safeParse({
      displayName: data.displayName ?? settings?.displayName ?? '',
      avatarUrl: data.avatarUrl ?? settings?.avatarUrl ?? null,
      profilePhotoVisibility: settings?.profilePhotoVisibility ?? 'everyone',
    });

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]) as keyof FormErrors;
        if (field === 'displayName' || field === 'avatarUrl') {
          newErrors[field] = issue.message;
        }
      });
      setErrors(newErrors);
      return { isValid: false, data: {} };
    }

    setErrors({});
    return { isValid: true, data };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, data } = validateForm();
    if (!isValid) return;

    // If no changes, just close
    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }

    // Submit the update
    updateProfile.mutate(data, {
      onError: (error) => {
        setErrors((prev) => ({
          ...prev,
          general: getSettingsErrorMessage(error),
        }));
      },
    });
  };

  const handleClose = () => {
    if (!updateProfile.isPending) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  // Show loading state
  if (isLoadingSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3390EC]" />
        </div>
      </div>
    );
  }

  // Show error if settings couldn't load
  if (!settings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <p>Failed to load profile data</p>
          </div>
          <button
            onClick={handleClose}
            className="mt-4 w-full px-4 py-2 bg-[#3390EC] text-white rounded-lg hover:bg-[#2a7bc9]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isSubmitDisabled = updateProfile.isPending;
  const hasChanges =
    displayName.trim() !== settings.displayName || avatarUrl !== settings.avatarUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
          <button
            onClick={handleClose}
            disabled={updateProfile.isPending}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success Message */}
        {isSuccess && (
          <div className="mx-4 mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            Profile updated successfully!
          </div>
        )}

        {/* Error Message */}
        {errors.general && (
          <div className="mx-4 mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Avatar Section */}
          <AvatarPicker
            value={avatarUrl}
            onChange={(newValue) => {
              setAvatarUrl(newValue);
              if (errors.avatarUrl) {
                setErrors((prev) => ({ ...prev, avatarUrl: undefined }));
              }
            }}
            disabled={updateProfile.isPending}
          />
          {errors.avatarUrl && (
            <p className="text-xs text-red-500 text-center">{errors.avatarUrl}</p>
          )}

          {/* Display Name */}
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (errors.displayName) {
                  setErrors((prev) => ({ ...prev, displayName: undefined }));
                }
              }}
              disabled={updateProfile.isPending}
              maxLength={100}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3390EC] disabled:opacity-50 disabled:bg-gray-100 ${
                errors.displayName ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your display name"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">{displayName.length}/100 characters</p>
              {errors.displayName && (
                <p className="text-xs text-red-500">{errors.displayName}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={updateProfile.isPending}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled || !hasChanges}
              className="flex-1 px-4 py-2 bg-[#3390EC] text-white rounded-lg hover:bg-[#2a7bc9] transition-colors disabled:opacity-50"
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
