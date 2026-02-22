import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginSchema, type LoginInput } from '@chat/shared/schemas/auth';
import { useLogin } from '../../hooks/useAuth';
import { extractRateLimitError } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, MessageCircle, Clock, AlertCircle } from 'lucide-react';

type LoginFormData = LoginInput;

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const [error, setError] = useState<string>('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [showUnauthorizedMsg, setShowUnauthorizedMsg] = useState(false);

  // Check if user was redirected due to unauthorized access
  useEffect(() => {
    const unauthorized = searchParams.get('unauthorized');
    if (unauthorized === 'true') {
      setShowUnauthorizedMsg(true);
      // Clear the query param
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    setRetryAfter(null);

    try {
      await login.mutateAsync(data);
      navigate('/');
    } catch (err: unknown) {
      // Check for rate limit error first
      const rateLimitError = extractRateLimitError(err);
      if (rateLimitError.isRateLimited) {
        setError(rateLimitError.message);
        setRetryAfter(rateLimitError.retryAfter ?? null);
        return;
      }

      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Invalid email or password');
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center pb-8">
        <div className="mx-auto w-20 h-20 bg-[#3390EC] rounded-full flex items-center justify-center shadow-lg">
          <MessageCircle className="w-10 h-10 text-white" />
        </div>
        <div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            Sign in to continue to Chat
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {showUnauthorizedMsg && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Your session has expired. Please log in again.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            {retryAfter && <Clock className="h-4 w-4" />}
            <AlertDescription className={retryAfter ? 'flex items-center gap-2' : ''}>
              {error}
              {retryAfter && (
                <span className="text-xs text-red-600">
                  (Retry in {retryAfter} seconds)
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              {...register('email')}
              type="email"
              id="email"
              placeholder="you@example.com"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <Input
              {...register('password')}
              type="password"
              id="password"
              placeholder="••••••••"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#3390EC] hover:bg-[#2a7bc8] text-white font-medium text-base rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
