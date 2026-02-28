import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '@clerk/clerk-react';
import {
  CheckCircle2,
  Youtube,
  GraduationCap,
  FileText,
  ChevronRight,
  Loader2,
  ArrowRight,
  Brain,
  Sparkles,
  Circle,
} from 'lucide-react';

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<string[]>([]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getToken } = useAuth();

  useEffect(() => {
    const youtube = searchParams.get('youtube');
    if (youtube === 'connected') {
      setConnected((prev) => (prev.includes('youtube') ? prev : [...prev, 'youtube']));
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.delete('youtube');
        next.delete('message');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleConnect = async (platform: string) => {
    if (platform === 'youtube') {
      setConnecting('youtube');
      try {
        const token = await getToken();
        const res = await fetch('/api/youtube-auth', {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (res.ok && typeof data?.url === 'string') {
          window.location.href = data.url;
          return;
        }
        setConnecting(null);
      } catch {
        setConnecting(null);
      }
      return;
    }
    setConnecting(platform);
    setTimeout(() => {
      setConnected((prev) => [...prev, platform]);
      setConnecting(null);
    }, 1500);
  };

  const handleContinue = () => {
    setStep(2);
  };

  useEffect(() => {
    if (step === 2) {
      // Simulate syncing data
      const timer = setTimeout(() => {
        setStep(3);
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (step === 3) {
      // Redirect after success
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-[#ffb347]/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-20%] right-[20%] w-[60%] h-[60%] bg-[#ffb347]/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
            <span>Connect</span>
            <span>Sync</span>
            <span>Ready</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            <motion.div 
              className="h-full bg-[#ffb347]"
              initial={{ width: "0%" }}
              animate={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-6 md:p-10"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ffb347] mb-4 shadow-lg">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Connect your learning sources</h1>
                <p className="text-slate-600 font-medium">We'll organize everything in one place.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Google Classroom */}
                <PlatformCard 
                  icon={GraduationCap}
                  name="Classroom"
                  color="bg-emerald-100 text-emerald-700 border-emerald-200"
                  isConnected={connected.includes('classroom')}
                  isConnecting={connecting === 'classroom'}
                  onConnect={() => handleConnect('classroom')}
                />
                
                {/* Notion */}
                <PlatformCard 
                  icon={FileText}
                  name="Notion"
                  color="bg-slate-100 text-slate-700 border-slate-200"
                  isConnected={connected.includes('notion')}
                  isConnecting={connecting === 'notion'}
                  onConnect={() => handleConnect('notion')}
                />

                {/* YouTube */}
                <PlatformCard 
                  icon={Youtube}
                  name="YouTube"
                  color="bg-red-100 text-red-700 border-red-200"
                  isConnected={connected.includes('youtube')}
                  isConnecting={connecting === 'youtube'}
                  onConnect={() => handleConnect('youtube')}
                />

                {/* Canvas */}
                <PlatformCard 
                  icon={Circle}
                  name="Canvas"
                  color="bg-orange-100 text-orange-700 border-orange-200"
                  isConnected={connected.includes('canvas')}
                  isConnecting={connecting === 'canvas'}
                  onConnect={() => handleConnect('canvas')}
                />
              </div>

              <div className="flex flex-col gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    connected.length > 0 
                      ? "bg-[#ffb347] text-white shadow-[#ffb347]/25 hover:shadow-[#ffb347]/40" 
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                  disabled={connected.length === 0}
                >
                  Continue <ArrowRight size={20} />
                </motion.button>
                
                <button 
                  onClick={handleContinue}
                  className="w-full py-3 text-slate-500 font-semibold hover:text-slate-700 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-10 flex flex-col items-center text-center min-h-[400px] justify-center"
            >
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-[#ffb347]/30 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#ffb347] rounded-full border-t-transparent animate-spin" />
                <Sparkles className="absolute inset-0 m-auto text-[#ffb347] w-8 h-8 animate-pulse" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 mb-2">Syncing your learning data...</h2>
              <p className="text-slate-600 font-medium mb-8 max-w-sm">
                We're analyzing your assignments, notes, and watch history to build your Knowledge Graph.
              </p>

              <div className="w-full max-w-xs space-y-3">
                <SyncItem label="Importing Classroom deadlines..." delay={0} />
                <SyncItem label="Indexing Notion pages..." delay={1} />
                <SyncItem label="Analyzing YouTube history..." delay={2} />
                <SyncItem label="Syncing Canvas courses..." delay={3} />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-xl border-2 border-slate-200 p-10 flex flex-col items-center text-center min-h-[400px] justify-center"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600 border-2 border-emerald-200 shadow-lg">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              
              <h2 className="text-2xl font-black text-slate-900 mb-2">You're all set!</h2>
              <p className="text-slate-600 font-medium">
                Redirecting you to your dashboard...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PlatformCard({ icon: Icon, name, color, isConnected, isConnecting, onConnect }: any) {
  return (
    <motion.button
      whileHover={!isConnected ? { scale: 1.05, y: -4 } : {}}
      whileTap={!isConnected ? { scale: 0.95 } : {}}
      onClick={!isConnected ? onConnect : undefined}
      className={`relative p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
        isConnected 
          ? 'bg-slate-50 border-slate-200 opacity-80 cursor-default' 
          : `bg-white hover:shadow-lg cursor-pointer ${color}`
      }`}
    >
      {isConnected && (
        <div className="absolute top-3 right-3 text-green-500 bg-white rounded-full p-0.5 shadow-sm">
          <CheckCircle2 size={20} fill="currentColor" className="text-white" />
        </div>
      )}
      
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? 'bg-slate-200 grayscale' : 'bg-white shadow-sm'}`}>
        {isConnecting ? (
          <Loader2 className="animate-spin text-slate-400" />
        ) : (
          <Icon size={24} />
        )}
      </div>
      
      <span className={`font-bold ${isConnected ? 'text-slate-400' : ''}`}>{name}</span>
      
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
        isConnected 
          ? 'bg-green-100 text-green-700' 
          : 'bg-slate-100 text-slate-500'
      }`}>
        {isConnected ? 'Connected' : 'Connect'}
      </span>
    </motion.button>
  );
}

function SyncItem({ label, delay }: { label: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.8 }}
      className="flex items-center gap-3 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100"
    >
      <CheckCircle2 className="w-4 h-4 text-green-500" />
      {label}
    </motion.div>
  );
}