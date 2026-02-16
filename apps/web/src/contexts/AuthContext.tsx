import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useCurrentUser, useLogin, useRegister, useLogout } from '../hooks/useAuth';
import { getAuthToken } from '../lib/api';
import type { LoginInput, RegisterInput, UserResponse } from '@chat/shared/schemas/auth';

interface AuthContextType {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutFn = useLogout();

  // Check for token on mount to trigger initial fetch
  useEffect(() => {
    const token = getAuthToken();
    if (!token && user) {
      // Token was removed, user should be cleared by queryClient.clear()
    }
  }, [user]);

  const login = async (data: LoginInput) => {
    await loginMutation.mutateAsync(data);
  };

  const register = async (data: RegisterInput) => {
    await registerMutation.mutateAsync(data);
  };

  const logout = () => {
    logoutFn();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user && !isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
