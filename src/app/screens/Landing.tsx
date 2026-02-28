import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  BookOpen,
  Target,
  CalendarDays,
  Mic2,
  Upload,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { ChatbotGLB } from '../components/ChatbotGLB';

const features = [
  {
    icon: BookOpen,
    title: 'Smart Material Synthesis',
    description: 'Upload your study materials and let AI extract key points, build knowledge structures, and turn scattered content into clear, digestible knowledge graphs.',
  },
  {
    icon: Target,
    title: 'Precise Gap Analysis',
    description: 'Based on your learning goals and current mastery, AI identifies knowledge blind spots so you can focus your effort where it matters most.',
  },
  {
    icon: CalendarDays,
    title: 'Personalized Study Plan',
    description: 'Get an actionable study plan tailored to your schedule and goals—with broken-down tasks and milestones to keep you on track.',
  },
  {
    icon: Mic2,
    title: 'AI Voice Narration',
    description: 'Turn complex concepts into listenable explanations. Learn during commutes, workouts, or any spare moment.',
  } as const,
];

const steps = [
  { icon: Upload, label: 'Upload materials' },
  { icon: Search, label: 'AI analysis' },
  { icon: Sparkles, label: 'Get your plan' },
  { icon: BookOpen, label: 'Start learning' },
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

export function Landing() {
  const [flipped, setFlipped] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Full-page background - extends behind rounded bar */}
      <div className="fixed inset-0 bg-slate-50 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ffb347]/30 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff8c42]/30 rounded-full blur-3xl" />
        <div className="absolute top-[20%] right-[10%] w-20 h-20 bg-cyan-300/20 rounded-full blur-2xl" />
      </div>

      {/* Top Bar */}
      <header className="sticky top-0 z-20 w-full px-4 pt-4 pb-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 md:px-8 py-4 bg-white rounded-3xl border border-slate-200/60 shadow-sm">
          <img
            src="/company_logo/logo.png"
            alt="M.U.S.T.Learn"
            className="h-10 md:h-12 w-auto object-contain cursor-pointer"
            onClick={() => scrollToSection('hero')}
          />
          <nav className="hidden md:flex items-center gap-6">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('why-choose')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Why choose us
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('footer')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Footer
            </button>
          </nav>
          <Link
            to="/login"
            className="rounded-xl bg-gradient-to-r from-[#ffb347] to-[#ff8c42] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200/50 transition-all hover:shadow-lg hover:scale-105 active:scale-100"
          >
            Try now
          </Link>
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center px-6 py-12 relative overflow-hidden">
        <div className="flex-1 flex flex-col items-center relative z-10 w-full">
        {/* Hero Section */}
        <section id="hero" className="flex flex-col items-center justify-center min-h-[70vh] max-w-4xl mx-auto scroll-mt-20">
          {/* 3D Bear Model */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md h-80 md:h-96 mb-6"
          >
            <ChatbotGLB
              url="/bot/Bear.glb"
              scale={1.8}
              className="rounded-2xl overflow-hidden"
              compact={false}
            />
          </motion.div>

          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center text-center"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
              Your brain's second memory—organized & traceable
            </h1>
            <p className="text-lg md:text-xl text-slate-600 font-medium mb-4 max-w-2xl">
              AI-powered learning: synthesize materials, find gaps, and get a study plan.
            </p>
            <p className="text-slate-500 mb-8 max-w-xl">
              M.U.S.T.Learn helps you focus your time on what matters.
            </p>

            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffb347] to-[#ff8c42] px-8 py-4 text-lg font-bold text-white shadow-lg shadow-orange-200/50 transition-all hover:shadow-xl hover:shadow-orange-300/50 hover:scale-105 active:scale-100"
            >
              Try now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full max-w-5xl mx-auto mt-20 mb-20 scroll-mt-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-4"
          >
            Core features
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-slate-600 text-center max-w-2xl mx-auto mb-12"
          >
            From upload to execution, AI guides the whole journey—learn faster and remember better.
          </motion.p>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, description }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="group h-56 [perspective:1000px] cursor-pointer"
                onClick={() => setFlipped(flipped === i ? null : i)}
              >
                <div
                  className="relative h-full w-full transition-transform duration-1000 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]"
                  style={flipped === i ? { transform: 'rotateY(180deg)' } : undefined}
                >
                  {/* Front */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/60 shadow-md [backface-visibility:hidden] p-6">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ffb347] to-[#ff8c42] flex items-center justify-center text-white shadow-lg">
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 text-center">{title}</h3>
                    <p className="text-sm text-slate-500 text-center">Hover to learn more</p>
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffb347]/10 to-[#ff8c42]/10 border border-[#ffb347]/30 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] p-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ffb347] to-[#ff8c42] flex items-center justify-center text-white mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 text-center mb-3">{title}</h3>
                    <p className="text-sm text-slate-600 text-center leading-relaxed">{description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="w-full max-w-4xl mx-auto mb-20 scroll-mt-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-4"
          >
            How it works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-slate-600 text-center max-w-xl mx-auto mb-12"
          >
            Four simple steps to kick off your AI-powered learning journey.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-wrap justify-center gap-4 md:gap-8"
          >
            {steps.map(({ icon: Icon, label }, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-white border-2 border-[#ffb347]/50 flex items-center justify-center text-[#ff8c42] shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight
                    className={`hidden md:block w-5 h-5 text-slate-300 -mx-2 -mt-6 ${i >= 1 ? 'ml-2' : ''}`}
                  />
                )}
              </div>
            ))}
          </motion.div>
        </section>

        {/* Benefits / Value Props */}
        <section id="why-choose" className="w-full max-w-3xl mx-auto mb-20 scroll-mt-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-slate-800 text-center mb-12"
          >
            Why choose M.U.S.T.Learn?
          </motion.h2>
          <motion.ul
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {[
              'Save time organizing—focus your energy on understanding and retaining',
              'Pinpoint knowledge gaps and avoid relearning what you already know',
              'Actionable, trackable plans so long-term learning stays on course',
              'Learn anywhere—commutes, workouts, or any spare moment',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#ff8c42] flex-shrink-0 mt-0.5" />
                <span className="text-slate-600">{text}</span>
              </li>
            ))}
          </motion.ul>
        </section>

        {/* Footer */}
        <footer id="footer" className="w-full max-w-6xl mx-auto scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-8 md:p-12 rounded-3xl bg-white/90 backdrop-blur-sm border border-slate-200/60 shadow-lg"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
              <div className="space-y-4 max-w-sm">
                <img
                  src="/company_logo/logo.png"
                  alt="M.U.S.T.Learn"
                  className="h-10 w-auto object-contain cursor-pointer"
                  onClick={() => scrollToSection('hero')}
                />
                <p className="text-slate-600">
                  AI-powered learning: synthesize materials, find gaps, and get a study plan.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                <div className="space-y-3">
                  <div className="text-sm font-bold text-slate-800">Product</div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection('features')}
                      className="text-left text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Features
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection('how-it-works')}
                      className="text-left text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      How it works
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection('why-choose')}
                      className="text-left text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Why choose us
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-bold text-slate-800">Account</div>
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/login"
                      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-bold text-slate-800">Get in touch</div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection('hero')}
                      className="text-left text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      Back to top
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-sm text-slate-500">
                © {new Date().getFullYear()} M.U.S.T.Learn. All rights reserved.
              </div>
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Try now
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
                >
                  Create account
                </Link>
              </div>
            </div>
          </motion.div>
        </footer>
        </div>
      </div>
    </div>
  );
}
