import { Link } from 'react-router';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '../components/ui/button';

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">404</h1>
        <p className="text-slate-600 mb-6">This page doesn’t exist or has been moved.</p>
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
