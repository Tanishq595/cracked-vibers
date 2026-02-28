import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <motion.div
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
        className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg"
      >
        <Sparkles className="w-8 h-8 text-white" />
      </motion.div>
    </div>
  );
}