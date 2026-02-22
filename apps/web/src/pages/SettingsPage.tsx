import { useState } from 'react';
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
  Globe
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  showChevron?: boolean;
}

function SettingItem({ icon, label, onClick, danger, showChevron = true }: SettingItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-100 transition-colors ${
        danger ? 'text-red-500 hover:bg-red-50' : ''
      }`}
    >
      <div className={`p-2 rounded-full ${danger ? 'bg-red-100' : 'bg-gray-100'}`}>
        {icon}
      </div>
      <span className="flex-1 text-left text-gray-900">{label}</span>
      {showChevron && <ChevronRight className="w-5 h-5 text-gray-400" />}
    </button>
  );
}

interface SettingSectionProps {
  title?: string;
  children: React.ReactNode;
}

function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <div className="mb-4">
      {title && (
        <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="bg-white rounded-lg mx-2 overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user, logout } = useAuthContext();
  const [privacySetting, setPrivacySetting] = useState<'everyone' | 'friends' | 'nobody'>('everyone');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#3390EC] text-white px-4 py-5">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1 -ml-1 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white mx-2 mt-2 rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3390EC] to-[#5c9ce6] flex items-center justify-center text-white text-2xl font-medium">
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{user?.displayName || 'User'}</h2>
            <p className="text-gray-500 text-sm">@{user?.username || 'username'}</p>
            <p className="text-gray-400 text-xs mt-1">Online</p>
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
            onClick={() => alert('Edit profile coming soon!')}
          />
          <div className="h-px bg-gray-100 mx-4" />
          <SettingItem 
            icon={<Lock className="w-5 h-5 text-gray-600" />}
            label="Privacy & Security"
            onClick={() => alert('Privacy settings coming soon!')}
          />
        </SettingSection>

        {/* Privacy Settings */}
        <SettingSection title="Privacy">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-gray-100">
                  <Shield className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-900">Last Seen</p>
                  <p className="text-gray-500 text-xs">Who can see your online status</p>
                </div>
              </div>
              <select
                value={privacySetting}
                onChange={(e) => setPrivacySetting(e.target.value as 'everyone' | 'friends' | 'nobody')}
                className="text-sm text-gray-500 bg-transparent border-none focus:outline-none text-right"
              >
                <option value="everyone">Everyone</option>
                <option value="friends">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>
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
              <select className="text-sm text-gray-500 bg-transparent border-none focus:outline-none text-right">
                <option value="everyone">Everyone</option>
                <option value="friends">My Contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>
          </div>
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-gray-100">
                  <Bell className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-gray-900">Push Notifications</p>
                  <p className="text-gray-500 text-xs">Receive message notifications</p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  notificationsEnabled ? 'bg-[#3390EC]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
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
    </div>
  );
}

export default SettingsPage;
