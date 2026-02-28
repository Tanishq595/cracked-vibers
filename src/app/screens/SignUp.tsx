import { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowRight, Brain, User, Mail, Lock } from 'lucide-react';

export function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate signup
    navigate('/onboarding');
  };

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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 mb-4 shadow-lg rotate-[6deg]">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Join M.U.S.T.Learn</h1>
          <p className="text-slate-600 font-medium">Start organizing your brain today.</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Tara Smith"
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="email" 
                placeholder="student@university.edu"
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Create a strong password"
                className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-indigo-500/40 transition-all mt-2"
          >
            Create Account <ArrowRight size={20} />
          </motion.button>
        </form>

        <div className="mt-8 text-center">
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