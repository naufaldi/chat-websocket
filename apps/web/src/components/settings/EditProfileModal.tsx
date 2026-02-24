import { useState, useEffect } from 'react';
import { X, User, Camera } from 'lucide-react';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: {
    displayName: string;
    avatarUrl: string | null;
  };
}

export function EditProfileModal({ isOpen, onClose, currentProfile }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [avatarUrl, setAvatarUrl] = useState(currentProfile.avatarUrl);
  const { mutate: updateProfile, isPending, isSuccess } = useUpdateProfile();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentProfile.displayName);
      setAvatarUrl(currentProfile.avatarUrl);
    }
  }, [isOpen, currentProfile.displayName, currentProfile.avatarUrl]);

  // Close modal on successful update
  useEffect(() => {
    if (isSuccess && isOpen) {
      onClose();
    }
  }, [isSuccess, isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      return;
    }

    const updates: { displayName?: string; avatarUrl?: string | null } = {};

    if (trimmedName !== currentProfile.displayName) {
      updates.displayName = trimmedName;
    }

    if (avatarUrl !== currentProfile.avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }

    // Only send update if there are changes
    if (Object.keys(updates).length > 0) {
      updateProfile(updates);
    } else {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isPending ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
          <button
            onClick={!isPending ? onClose : undefined}
            disabled={isPending}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#3390EC] to-[#5c9ce6] flex items-center justify-center text-white text-3xl font-medium overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = prompt('Enter avatar URL (or leave empty to remove):', avatarUrl ?? '');
                  if (url !== null) {
                    setAvatarUrl(url.trim() || null);
                  }
                }}
                disabled={isPending}
                className="absolute bottom-0 right-0 p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Tap to change photo</p>
          </div>

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
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isPending}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3390EC] disabled:opacity-50 disabled:bg-gray-100"
              placeholder="Enter your display name"
            />
            <p className="text-xs text-gray-500 mt-1">
              {displayName.length}/100 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !displayName.trim()}
              className="flex-1 px-4 py-2 bg-[#3390EC] text-white rounded-lg hover:bg-[#2a7bc9] transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
