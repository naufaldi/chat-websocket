import * as React from 'react';
import { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { changePasswordSchema } from '@chat/shared/schemas/settings';
import type { ChangePasswordInput } from '@chat/shared/schemas/settings';
import { useChangePassword, getSettingsErrorMessage } from '@/hooks/useSettings';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormField = 'currentPassword' | 'newPassword' | 'confirmPassword';

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [formData, setFormData] = useState<ChangePasswordInput>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPasswords, setShowPasswords] = useState<Record<FormField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const changePasswordMutation = useChangePassword();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form state when modal opens
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setErrors({});
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setSuccessMessage(null);
    }
  }, [isOpen]);

  // Close on successful password change after delay
  useEffect(() => {
    if (changePasswordMutation.isSuccess && successMessage) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [changePasswordMutation.isSuccess, successMessage, onClose]);

  const handleInputChange = (field: FormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear general error
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
    // Clear success message on new input
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  const togglePasswordVisibility = (field: FormField) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = (): boolean => {
    const result = changePasswordSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]) as FormField;
        newErrors[field] = issue.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await changePasswordMutation.mutateAsync(formData);
      setSuccessMessage('Password changed successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      const message = getSettingsErrorMessage(error);
      setErrors((prev) => ({
        ...prev,
        general: message,
      }));
    }
  };

  const handleClose = () => {
    if (!changePasswordMutation.isPending) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  const isSubmitDisabled =
    !formData.currentPassword ||
    !formData.newPassword ||
    !formData.confirmPassword ||
    changePasswordMutation.isPending;

  const inputClasses = (field: FormField) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3390EC] disabled:opacity-50 disabled:bg-gray-100 ${
      errors[field] ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
    }`;

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
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={changePasswordMutation.isPending}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
              {errors.general}
            </div>
          )}

          {/* Current Password */}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.currentPassword ? 'text' : 'password'}
                id="currentPassword"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                disabled={changePasswordMutation.isPending}
                className={inputClasses('currentPassword')}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('currentPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                tabIndex={-1}
              >
                {showPasswords.currentPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.newPassword ? 'text' : 'password'}
                id="newPassword"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                disabled={changePasswordMutation.isPending}
                className={inputClasses('newPassword')}
                placeholder="Enter your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('newPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                tabIndex={-1}
              >
                {showPasswords.newPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                disabled={changePasswordMutation.isPending}
                className={inputClasses('confirmPassword')}
                placeholder="Confirm your new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirmPassword')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                tabIndex={-1}
              >
                {showPasswords.confirmPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={changePasswordMutation.isPending}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 px-4 py-2 bg-[#3390EC] text-white rounded-lg hover:bg-[#2a7bc9] transition-colors disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
