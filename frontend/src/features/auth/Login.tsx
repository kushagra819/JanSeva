import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Building2, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiClient, FetchError } from '../../api/client';
import type { AuthResponse, Role } from '../../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import janSevaLogo from '../../assets/jandhwani-logo.jpeg';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required')
});

type LoginForm = z.infer<typeof loginSchema>;
type Portal = 'citizen' | 'department' | 'admin';

const portals: Record<Portal, { title: string; description: string; roles: Role[]; icon: typeof UserRound; destination: string }> = {
  citizen: { title: 'Citizen sign in', description: 'Raise an issue, track it and receive resolution updates.', roles: ['CITIZEN'], icon: UserRound, destination: '/citizen' },
  department: { title: 'Department sign in', description: 'Manage assigned issues and keep citizens updated.', roles: ['OFFICER', 'DEPARTMENT_HEAD'], icon: Building2, destination: '/staff' },
  admin: { title: 'Admin sign in', description: 'Manage departments, staff and city-wide operations.', roles: ['ADMIN', 'COMMISSIONER'], icon: ShieldCheck, destination: '/staff' }
};

const portalForRole = (role: Role): Portal => role === 'CITIZEN' ? 'citizen' : ['ADMIN', 'COMMISSIONER'].includes(role) ? 'admin' : 'department';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedPortal = searchParams.get('portal');
  const portal: Portal = requestedPortal === 'department' || requestedPortal === 'admin' ? requestedPortal : 'citizen';
  const config = portals[portal];
  const PortalIcon = config.icon;
  const [serverError, setServerError] = useState('');

  const portalEntries = useMemo(() => Object.entries(portals) as [Portal, typeof portals[Portal]][], []);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setServerError('');
      const response = await apiClient<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      if (!config.roles.includes(response.user.role)) {
        void apiClient('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: response.refreshToken }) }).catch(() => undefined);
        const correctPortal = portalForRole(response.user.role);
        setServerError(`This is a ${correctPortal} account. Please use the ${correctPortal} portal.`);
        return;
      }

      login(response);
      const requestedPath = location.state?.from?.pathname as string | undefined;
      const validRequestedPath = requestedPath && (portal === 'citizen' ? requestedPath.startsWith('/citizen') : requestedPath.startsWith('/staff'));
      navigate(validRequestedPath ? requestedPath : config.destination, { replace: true });
    } catch (error) {
      setServerError(error instanceof FetchError ? error.data.message : 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative w-full max-w-md">
        <Link to="/" aria-label="JanDhwani home" className="mb-5 flex justify-center"><img src={janSevaLogo} alt="JanDhwani" className="h-10 w-auto object-contain" /></Link>
        <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to live map</Link>
        <Card className="rounded-[2rem] border-white/10 p-2 backdrop-blur-xl">
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/15 p-1" aria-label="Select sign in portal">
            {portalEntries.map(([key, item]) => {
              const Icon = item.icon;
              return <Link key={key} to={`/login?portal=${key}`} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium capitalize transition ${portal === key ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--muted)] hover:text-white'}`}><Icon className="h-4 w-4" />{key}</Link>;
            })}
          </div>
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(42,127,255,.3),rgba(141,103,255,.25))]">
              <PortalIcon className="h-7 w-7 text-[var(--accent-strong)]" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300" role="alert">{serverError}</div>}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="email">Email address</label>
                <div className="relative"><Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /><Input id="email" type="email" autoComplete="email" placeholder="name@example.com" className="pl-10" {...register('email')} /></div>
                {errors.email && <p className="text-sm text-[var(--danger)]">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <div className="relative"><Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" /><Input id="password" type="password" autoComplete="current-password" placeholder="Your password" className="pl-10" {...register('password')} /></div>
                {errors.password && <p className="text-sm text-[var(--danger)]">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : `Sign in to ${portal}`}</Button>
            </form>
          </CardContent>
          {portal === 'citizen' && <CardFooter className="flex justify-center"><p className="text-sm text-[var(--muted)]">New to JanDhwani? <Link to="/register" className="font-semibold text-[var(--accent-strong)] hover:text-white">Create an account</Link></p></CardFooter>}
        </Card>
      </div>
    </div>
  );
};
