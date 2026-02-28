import { motion } from 'motion/react';
import { Link } from 'react-router';
import { Brain } from 'lucide-react';
import { SignUp as ClerkSignUp } from '@clerk/clerk-react';

export function SignUp() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute top-[20%] left-[10%] w-20 h-20 bg-cyan-300/20 rounded-full blur-2xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-8 relative z-10"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 mb-4 shadow-lg rotate-[6deg]">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Join M.U.S.T.Learn</h1>
          <p className="text-slate-600 font-medium">Start organizing your brain today.</p>
        </div>

        <ClerkSignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          fallbackRedirectUrl="/onboarding"
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none border-0 p-0 bg-transparent',
            },
          }}
        />

        <div className="mt-6 text-center">
          <p className="text-slate-600 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-bold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
