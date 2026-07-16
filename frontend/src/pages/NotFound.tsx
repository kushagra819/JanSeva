import { Link } from 'react-router';

export const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-center px-4">
      <h1 className="text-9xl font-extrabold text-slate-200">404</h1>
      <h2 className="mt-8 text-2xl font-bold tracking-tight text-slate-900 sm:text-4xl">Page Not Found</h2>
      <p className="mt-4 text-lg text-slate-500">The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="mt-8 inline-flex items-center justify-center rounded-md bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
        Return Home
      </Link>
    </div>
  );
};
