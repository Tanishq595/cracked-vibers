import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ChatbotGLB } from '../components/ChatbotGLB';

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ffb347]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff8c42]/30 rounded-full blur-3xl" />
        <div className="absolute top-[20%] right-[10%] w-20 h-20 bg-cyan-300/20 rounded-full blur-2xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        {/* 3D Bear Model */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-xs h-64 mb-6"
        >
          <ChatbotGLB
            url="/bot/Bear.glb"
            scale={1.2}
            className="rounded-2xl overflow-hidden"
            compact={false}
          />
        </motion.div>

        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center text-center max-w-2xl"
        >
          <img
            src="/company_logo/logo.png"
            alt="M.U.S.T.Learn"
            className="h-32 md:h-40 w-auto mb-6 object-contain"
          />
          <p className="text-lg md:text-xl text-slate-600 font-medium mb-8 max-w-xl mx-auto">
            Your brain's second memory—organized. AI-powered learning: synthesize materials, find gaps,
            get a study plan and narration.
          </p>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffb347] to-[#ff8c42] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200/50 transition-all hover:shadow-xl hover:shadow-orange-300/50 hover:scale-105 active:scale-100"
          >
            Try now
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
