import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import { Loader2 } from 'lucide-react';

// Placeholder for chat page (will be implemented in TASK-004)
function ChatPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#efeae2]">
      <div className="bg-[#3390EC] text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-medium">Chat</h1>
          <div className="flex items-center gap-4">
            <span>{user?.displayName}</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-[#2a7bc8] rounded-lg hover:bg-[#2369a8] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-gray-600">Welcome to Chat! Start a conversation.</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#efeae2]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3390EC]" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
