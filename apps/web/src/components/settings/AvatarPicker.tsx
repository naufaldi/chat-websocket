import * as React from 'react';
import { useRef, useState } from 'react';
import { X, Upload, Link, Image } from 'lucide-react';

interface AvatarPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

type InputMode = 'preview' | 'url' | 'file';

export function AvatarPicker({ value, onChange, disabled }: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<InputMode>('preview');
  const [urlInput, setUrlInput] = useState(value ?? '');
  const [previewError, setPreviewError] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onChange(result);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onChange(null);
    } else {
      onChange(trimmed);
    }
    setMode('preview');
  };

  const handleRemove = () => {
    onChange(null);
    setUrlInput('');
    setPreviewError(false);
  };

  const showImage = value && !previewError;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#3390EC] to-[#5c9ce6] flex items-center justify-center text-white text-3xl font-medium overflow-hidden">
          {showImage ? (
            <img
              src={value}
              alt="Profile"
              className="w-full h-full object-cover"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <Image className="w-12 h-12" />
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {mode === 'preview' && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#3390EC] hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Upload Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => setMode('url')}
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <Link className="w-4 h-4" />
              Use URL
            </button>
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Remove
              </button>
            )}
          </>
        )}

        {mode === 'url' && (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              disabled={disabled}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3390EC] disabled:opacity-50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode('preview');
                  setUrlInput(value ?? '');
                }}
                disabled={disabled}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUrlSubmit}
                disabled={disabled}
                className="px-3 py-1.5 text-sm bg-[#3390EC] text-white rounded-lg hover:bg-[#2a7bc9] disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {mode === 'preview' ? 'Tap to change photo' : 'Enter a URL to use as your profile photo'}
      </p>
    </div>
  );
}
