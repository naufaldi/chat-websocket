import { Link } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e3f2fd] via-[#f3e5f5] to-[#e8f5e9] flex flex-col items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(51,144,236,0.1),transparent_50%)]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        <LoginForm />

        {/* Footer link */}
        <p className="text-center mt-8 text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-[#3390EC] hover:text-[#2a7bc8] transition-colors"
          >
            Create Account
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-sm text-gray-400">
        <p>Secure messaging platform</p>
      </div>
    </div>
  );
}
