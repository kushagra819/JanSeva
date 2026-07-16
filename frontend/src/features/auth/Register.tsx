import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from './AuthContext';
import { apiClient, FetchError } from '../../api/client';
import type { AuthResponse } from '../../types';
import { useNavigate, Link } from 'react-router';
import { Shield, Mail, Lock, User, Phone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import janSevaLogo from '../../assets/jandhwani-logo.jpeg';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password needs an uppercase letter')
    .regex(/[a-z]/, 'Password needs a lowercase letter')
    .regex(/[0-9]/, 'Password needs a number')
    .regex(/[^A-Za-z0-9]/, 'Password needs a symbol')
});

type RegisterForm = z.infer<typeof registerSchema>;

export const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string>('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setServerError('');
      const response = await apiClient<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      login(response);
      navigate('/citizen', { replace: true });
    } catch (error) {
      if (error instanceof FetchError) {
        setServerError(error.data.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative w-full max-w-lg"><Link to="/" aria-label="JanDhwani home" className="mb-5 flex justify-center"><img src={janSevaLogo} alt="JanDhwani" className="h-10 w-auto object-contain" /></Link><Card className="rounded-[2rem] border-white/10 p-2 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(42,127,255,.3),rgba(141,103,255,.25))]">
            <Shield className="h-7 w-7 text-[var(--accent-strong)]" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Join JanDhwani to track and submit civic grievances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            {serverError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 sm:col-span-2">
                {serverError}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input
                  id="name"
                  placeholder="Rahul Sharma"
                  className="pl-10"
                  {...register('name')}
                />
              </div>
              {errors.name && <p className="text-sm text-[var(--danger)]">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-[var(--danger)]">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="phone">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  className="pl-10"
                  {...register('phone')}
                />
              </div>
              {errors.phone && <p className="text-sm text-[var(--danger)]">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-sm text-[var(--danger)]">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full sm:col-span-2" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-[var(--muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--accent-strong)] hover:text-white">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card></div>
    </div>
  );
};
