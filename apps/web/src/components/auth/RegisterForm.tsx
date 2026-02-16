import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { registerSchema, type RegisterInput } from '@chat/shared/schemas/auth';
import { useRegister } from '../../hooks/useAuth';
import { extractRateLimitError } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, UserPlus, Clock } from 'lucide-react';

// Extend schema with confirmPassword
const registerWithConfirmSchema = registerSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = RegisterInput & { confirmPassword: string };

export function RegisterForm() {
  const navigate = useNavigate();
  const register = useRegister();
  const [error, setError] = useState<string>('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerWithConfirmSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setRetryAfter(null);

    try {
      // Extract relevant fields for registration
      const { confirmPassword, ...registerData } = data;
      await register.mutateAsync(registerData);
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
      setError(axiosError.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-4 text-center pb-8">
        <div className="mx-auto w-20 h-20 bg-[#3390EC] rounded-full flex items-center justify-center shadow-lg">
          <UserPlus className="w-10 h-10 text-white" />
        </div>

        <div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            Create Account
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            Join Chat today
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
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
              {...registerField('email')}
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
            <Label htmlFor="username" className="text-sm font-medium text-gray-700">
              Username
            </Label>
            <Input
              {...registerField('username')}
              type="text"
              id="username"
              placeholder="johndoe"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.username && (
              <p className="text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium text-gray-700">
              Display Name
            </Label>
            <Input
              {...registerField('displayName')}
              type="text"
              id="displayName"
              placeholder="John Doe"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.displayName && (
              <p className="text-sm text-red-500">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <Input
              {...registerField('password')}
              type="password"
              id="password"
              placeholder="••••••••"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirm Password
            </Label>
            <Input
              {...registerField('confirmPassword')}
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              className="h-12 border-gray-200 focus:border-[#3390EC] focus:ring-[#3390EC]/20"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
