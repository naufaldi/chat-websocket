import * as React from 'react';
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Lock,
  Bell,
  Palette,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  Shield,
  Users,
  Globe,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  useSettings,
  useUpdateProfileSettings,
  useUpdatePrivacySettings,
  useUpdateNotificationSettings,
  getSettingsErrorMessage,
} from '@/hooks/useSettings';
import { useAutoSaveMutation } from '@/hooks/useDebouncedMutation';
import { usePushNotificationToggle } from '@/hooks/usePushNotifications';
import { EditProfileModal } from '@/components/settings/EditProfileModal';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { presenceSharingSchema } from '@chat/shared/schemas/presence';
import type { PresenceSharing } from '@chat/shared/schemas/presence';

// ============================================================================
// Types
// ============================================================================

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  showChevron?: boolean;
  disabled?: boolean;
}

interface SettingSectionProps {
  title?: string;
  children: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
  isLoading?: boolean;
}

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}

// ============================================================================
// Components
// ============================================================================

function ToggleSwitch({ enabled, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-12 h-7 rounded-full transition-colors relative disabled:opacity-50 ${
        enabled ? 'bg-[#3390EC]' : 'bg-gray-300'
      }`}
      aria-checked={enabled}
      role="switch"
    >
      <span
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SettingItem({
  icon,
  label,
  onClick,
  danger,
  showChevron = true,
  disabled,
}: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-100 transition-colors ${
        danger ? 'text-red-500 hover:bg-red-50' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className={`p-2 rounded-full ${danger ? 'bg-red-100' : 'bg-gray-100'}`}>
        {icon}
      </div>
      <span className="flex-1 text-left text-gray-900">{label}</span>
      {showChevron && <ChevronRight className="w-5 h-5 text-gray-400" />}
    </button>
  );
}

function SettingSection({
  title,
  children,
  error,
  onRetry,
  isLoading,
}: SettingSectionProps) {
  return (
    <div className="mb-4">
      {title && (
        <div className="px-4 py-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {title}
          </h3>
          {isLoading && (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>
      )}
      <div className="bg-white rounded-lg mx-2 overflow-hidden shadow-sm">
        {children}
      </div>
      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 flex-1">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SaveIndicator({
  isSaving,
  isError,
  hasChanges,
}: {
  isSaving: boolean;
  isError: boolean;
  hasChanges: boolean;
}) {
  if (isError) {
    return (
      <span className="text-xs text-red-500 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Error saving
      </span>
    );
  }

  if (isSaving) {
    return (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Saving...
      </span>
    );
  }

  if (hasChanges) {
    return (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Check className="w-3 h-3" />
        Saved
      </span>
    );
  }

  return null;
}

// ============================================================================
// Main Page Component
// ============================================================================

export function SettingsPage() {
  const { logout } = useAuthContext();

  // Settings data
  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings,
  } = useSettings();

  // Mutations
  const profileMutation = useUpdateProfileSettings();
  const privacyMutation = useUpdatePrivacySettings();
  const notificationsMutation = useUpdateNotificationSettings();

  // Debounced mutations for auto-save
  const debouncedProfile = useAutoSaveMutation(profileMutation, { debounceMs: 500 });
  const debouncedPrivacy = useAutoSaveMutation(privacyMutation, { debounceMs: 500 });
  const debouncedNotifications = useAutoSaveMutation(notificationsMutation, { debounceMs: 500 });

  // Push notifications
  const pushNotifications = usePushNotificationToggle();

  // Modal states
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Handle logout
  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  // Handle profile photo visibility change
  const handlePhotoVisibilityChange = useCallback(
    (value: PresenceSharing) => {
      debouncedProfile.debouncedMutate({ profilePhotoVisibility: value });
    },
    [debouncedProfile]
  );

  // Handle privacy sharing change
  const handlePresenceSharingChange = useCallback(
    (value: PresenceSharing) => {
      debouncedPrivacy.debouncedMutate({ presenceSharing: value });
    },
    [debouncedPrivacy]
  );

  // Handle presence enabled toggle
  const handlePresenceToggle = useCallback(() => {
    if (settings) {
      debouncedPrivacy.debouncedMutate({ presenceEnabled: !settings.presenceEnabled });
    }
  }, [debouncedPrivacy, settings]);

  // Handle read receipts toggle
  const handleReadReceiptsToggle = useCallback(() => {
    if (settings) {
      debouncedPrivacy.debouncedMutate({ readReceiptsEnabled: !settings.readReceiptsEnabled });
    }
  }, [debouncedPrivacy, settings]);

  // Handle push notifications toggle
  const handlePushToggle = useCallback(async () => {
    await pushNotifications.toggle();
    // Sync with API if successful
    if (settings && pushNotifications.permission === 'granted') {
      debouncedNotifications.debouncedMutate({
        pushNotificationsEnabled: !settings.pushNotificationsEnabled,
      });
    }
  }, [pushNotifications, debouncedNotifications, settings]);

  // Get presence sharing options
  const presenceOptions = presenceSharingSchema.options;

  // Loading state
  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#3390EC] animate-spin" />
          <p className="text-gray-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (settingsError || !settings) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load settings</h2>
          <p className="text-gray-500 mb-4">
            {settingsError ? getSettingsErrorMessage(settingsError) : 'Unable to load your settings'}
          </p>
          <button
            onClick={() => refetchSettings()}
            className="px-4 py-2 bg-[#3390EC] text-white rounded-lg hover:bg-[#2a7bc9] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#3390EC] text-white px-4 py-5">
        <div className="flex items-center gap-3">
          <Link to="/chat" className="p-1 -ml-1 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white mx-2 mt-2 rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3390EC] to-[#5c9ce6] flex items-center justify-center text-white text-2xl font-medium overflow-hidden">
            {settings.avatarUrl ? (
              <img
                src={settings.avatarUrl}
                alt={settings.displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to initial on image error
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              settings.displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{settings.displayName}</h2>
            <p className="text-gray-500 text-sm">@{settings.username}</p>
            <p className="text-gray-400 text-xs mt-1">
              {settings.presenceEnabled ? 'Online' : 'Offline'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Settings Sections */}
      <div className="mt-4">
        {/* Account Section */}
        <SettingSection title="Account">
          <SettingItem
            icon={<User className="w-5 h-5 text-gray-600" />}
            label="Edit Profile"
            onClick={() => setIsEditProfileOpen(true)}
          />
          <div className="h-px bg-gray-100 mx-4" />
          <SettingItem
            icon={<Lock className="w-5 h-5 text-gray-600" />}
            label="Change Password"
            onClick={() => setIsChangePasswordOpen(true)}
          />
        </SettingSection>

        {/* Privacy Section */}
        <SettingSection
          title="Privacy"
          error={
            debouncedPrivacy.isError
              ? getSettingsErrorMessage(debouncedPrivacy.error)
              : null
          }
          onRetry={() => debouncedPrivacy.flush()}
        >
          {/* Presence Enabled Toggle */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-gray-100">
                  <Shield className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-900">Online Status</p>
                  <p className="text-gray-500 text-xs">
                    {settings.presenceEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SaveIndicator
                  isSaving={debouncedPrivacy.isDebouncing || debouncedPrivacy.isPending}
                  isError={debouncedPrivacy.isError}
                  hasChanges={debouncedPrivacy.isSuccess}
                />
                <ToggleSwitch
                  enabled={settings.presenceEnabled}
                  onChange={handlePresenceToggle}
                  disabled={debouncedPrivacy.isPending}
                />
              </div>
            </div>
          </div>

          {/* Presence Sharing (only if presence is enabled) */}
          {settings.presenceEnabled && (
            <>
              <div className="h-px bg-gray-100 mx-4" />
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-gray-100">
                      <Shield className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-gray-900">Who Can See You Online</p>
                      <p className="text-gray-500 text-xs">Control your online visibility</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SaveIndicator
                      isSaving={debouncedPrivacy.isDebouncing || debouncedPrivacy.isPending}
                      isError={debouncedPrivacy.isError}
                      hasChanges={debouncedPrivacy.isSuccess}
                    />
                    <select
                      value={settings.presenceSharing}
                      onChange={(e) =>
                        handlePresenceSharingChange(e.target.value as PresenceSharing)
                      }
                      disabled={debouncedPrivacy.isPending}
                      className="text-sm text-gray-500 bg-transparent border-none focus:outline-none text-right disabled:opacity-50"
                    >
                      {presenceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Profile Photo Visibility */}
          <div className="h-px bg-gray-100 mx-4" />
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-gray-100">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-900">Profile Photo</p>
                  <p className="text-gray-500 text-xs">Who can see your profile photo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SaveIndicator
                  isSaving={debouncedProfile.isDebouncing || debouncedProfile.isPending}
                  isError={debouncedProfile.isError}
                  hasChanges={debouncedProfile.isSuccess}
                />
                <select
                  value={settings.profilePhotoVisibility}
                  onChange={(e) =>
                    handlePhotoVisibilityChange(e.target.value as PresenceSharing)
                  }
                  disabled={debouncedProfile.isPending}
                  className="text-sm text-gray-500 bg-transparent border-none focus:outline-none text-right disabled:opacity-50"
                >
                  {presenceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Read Receipts */}
          <div className="h-px bg-gray-100 mx-4" />
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-gray-100">
                  <Globe className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-900">Read Receipts</p>
                  <p className="text-gray-500 text-xs">
                    {settings.readReceiptsEnabled
                      ? 'Others can see when you read messages'
                      : 'Others cannot see when you read messages'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SaveIndicator
                  isSaving={debouncedPrivacy.isDebouncing || debouncedPrivacy.isPending}
                  isError={debouncedPrivacy.isError}
                  hasChanges={debouncedPrivacy.isSuccess}
                />
                <ToggleSwitch
                  enabled={settings.readReceiptsEnabled}
                  onChange={handleReadReceiptsToggle}
                  disabled={debouncedPrivacy.isPending}
                />
              </div>
            </div>
          </div>
        </SettingSection>

        {/* Notifications Section */}
        <SettingSection
          title="Notifications"
          error={
            pushNotifications.error ||
            (debouncedNotifications.isError
              ? getSettingsErrorMessage(debouncedNotifications.error)
              : null)
          }
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-gray-100">
                  <Bell className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-900">Push Notifications</p>
                  <p className="text-gray-500 text-xs">
                    {!pushNotifications.isSupported
                      ? 'Not supported on this device'
                      : pushNotifications.permission === 'denied'
                        ? 'Blocked in browser settings'
                        : 'Receive message notifications'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SaveIndicator
                  isSaving={
                    pushNotifications.isLoading ||
                    debouncedNotifications.isDebouncing ||
                    debouncedNotifications.isPending
                  }
                  isError={debouncedNotifications.isError}
                  hasChanges={debouncedNotifications.isSuccess}
                />
                <ToggleSwitch
                  enabled={pushNotifications.isEnabled}
                  onChange={handlePushToggle}
                  disabled={
                    !pushNotifications.isSupported ||
                    pushNotifications.isLoading ||
                    debouncedNotifications.isPending
                  }
                />
              </div>
            </div>
          </div>

          {/* Message Preview */}
          <div className="h-px bg-gray-100 mx-4" />
          <SettingItem
            icon={<Globe className="w-5 h-5 text-gray-600" />}
            label="Message Preview"
            onClick={() => alert('Message preview settings coming soon!')}
          />
        </SettingSection>

        {/* Appearance */}
        <SettingSection title="Appearance">
          <SettingItem
            icon={<Palette className="w-5 h-5 text-gray-600" />}
            label="Theme"
            onClick={() => alert('Theme settings coming soon!')}
          />
        </SettingSection>

        {/* Account Info */}
        <SettingSection title="Account Info">
          <div className="px-4 py-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900">{settings.email}</p>
            </div>
          </div>
          <div className="h-px bg-gray-100 mx-4" />
          <div className="px-4 py-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-500">Username</p>
              <p className="text-gray-900">@{settings.username}</p>
            </div>
          </div>
        </SettingSection>

        {/* Help & About */}
        <SettingSection title="Help">
          <SettingItem
            icon={<HelpCircle className="w-5 h-5 text-gray-600" />}
            label="FAQ"
            onClick={() => alert('FAQ coming soon!')}
          />
          <div className="h-px bg-gray-100 mx-4" />
          <SettingItem
            icon={<Info className="w-5 h-5 text-gray-600" />}
            label="About"
            onClick={() => alert('Chat App v1.0.0')}
          />
        </SettingSection>

        {/* Logout */}
        <div className="mt-6 mb-8">
          <SettingItem
            icon={<LogOut className="w-5 h-5" />}
            label="Log Out"
            onClick={handleLogout}
            danger
            showChevron={false}
          />
        </div>

        {/* App Version */}
        <div className="text-center pb-8">
          <p className="text-gray-400 text-xs">Chat App v1.0.0</p>
          <p className="text-gray-400 text-xs">Made with ❤️</p>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}

export default SettingsPage;
