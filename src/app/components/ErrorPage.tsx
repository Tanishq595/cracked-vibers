import { useRouteError, Link, isRouteErrorResponse } from 'react-router';
import { AlertCircle, Home } from 'lucide-react';
import { Button } from './ui/button';

export function ErrorPage() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const message = isRouteErrorResponse(error)
    ? error.statusText || error.data?.message || 'Something went wrong'
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {is404 ? 'Page not found' : 'Something went wrong'}
        </h1>
        <p className="text-slate-600 mb-6">{message}</p>
        <Button asChild variant="default" className="gap-2">
          <Link to="/">
            <Home className="w-4 h-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
