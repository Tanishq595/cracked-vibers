import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  Flame,
  Sparkles,
  ChevronRight,
  Youtube,
  FileText,
  BookOpen,
  Play,
  CheckCircle2,
  TrendingUp,
  Zap,
  ArrowRight,
  Circle,
  Network,
  Search,
  Calendar,
  MessageCircle,
  X,
  Send,
  Trophy,
} from "lucide-react";
import { useState, useEffect, Component, useCallback, type ReactNode } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { KnowledgeGraph } from "../components/KnowledgeGraph";
import { ChatbotGLB } from "../components/ChatbotGLB";
import { useNavigate } from "react-router";
import { useTopGaps } from "./GapAnalysis";

const CHAT_HISTORY_KEY = "mustlearn_chat_history_";
const DEFAULT_GREETING = {
  role: "assistant" as const,
  content:
    "Hi! I'm your M.U.S.T.Learn AI assistant! 👋 I can read your files, list your syntheses, search your library, and answer questions—all in chat. Try: \"What files do I have?\" or \"Search my library for...\"",
};

function loadChatHistory(userId: string | null): { role: "user" | "assistant"; content: string }[] {
  if (!userId) return [DEFAULT_GREETING];
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY + userId);
    if (!raw) return [DEFAULT_GREETING];
    const parsed = JSON.parse(raw) as { role: "user" | "assistant"; content: string }[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_GREETING];
  } catch {
    return [DEFAULT_GREETING];
  }
}

function saveChatHistory(userId: string | null, messages: { role: "user" | "assistant"; content: string }[]) {
  if (!userId) return;
  try {
    localStorage.setItem(CHAT_HISTORY_KEY + userId, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

const platforms: Array<{
  name: string;
  icon: typeof Youtube;
  color: string;
  bgColor: string;
  borderColor: string;
  status: string;
  items: number;
  path?: string;
}> = [
  { name: 'Google Classroom', icon: BookOpen, color: '#34A853', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', status: 'synced', items: 142 },
  { name: 'Notion', icon: FileText, color: '#000000', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', status: 'synced', items: 89 },
  { name: 'YouTube', icon: Youtube, color: '#FF0000', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', status: 'synced', items: 0, path: '/dashboard/youtube' },
  { name: 'Canvas', icon: Circle, color: '#E13F2F', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', status: 'syncing', items: 67 },
];

const INSIGHT_CARD_GRADIENTS = [
  { progressColor: 'text-orange-400', stopColors: ['#ffb347', '#ff8c42'], bgGradient: 'from-[#ffb347] to-[#ff8c42]' },
  { progressColor: 'text-emerald-400', stopColors: ['#059669', '#0d9488'], bgGradient: 'from-emerald-600 to-teal-600' },
  { progressColor: 'text-amber-400', stopColors: ['#f59e0b', '#ea580c'], bgGradient: 'from-amber-500 to-orange-500' },
] as const;

const mascotBubbleMessages = [
  'Stressed out while studying? 😤 Play around with me!',
  'Need a break? Let\'s have some fun! 🎮',
  'Feeling overwhelmed? I\'m here for you! 🧡',
  'Take a breather — you\'ve got this! 💪',
  'Study break? Let\'s play! 🐻',
  'Hey! Want to hang out? ✨',
];

const recentActivity = [
  {
    type: 'video',
    title: 'How DNA Replication Works',
    platform: 'YouTube',
    platformColor: '#FF0000',
    time: '23 min',
    thumbnail: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400&h=200&fit=crop',
    timeAgo: '2h ago'
  },
  {
    type: 'note',
    title: 'Quantum Mechanics - Chapter 5',
    platform: 'Notion',
    platformColor: '#000000',
    time: 'Updated',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop',
    timeAgo: '4h ago'
  },
  {
    type: 'assignment',
    title: 'Renaissance Art Analysis',
    platform: 'Classroom',
    platformColor: '#34A853',
    time: 'Due tomorrow',
    thumbnail: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=200&fit=crop',
    timeAgo: '1d ago'
  },
  {
    type: 'pdf',
    title: 'Linear Algebra Formulas',
    platform: 'Canvas',
    platformColor: '#E13F2F',
    time: '12 pages',
    thumbnail: 'https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&h=200&fit=crop',
    timeAgo: '2d ago'
  },
  {
    type: 'video',
    title: 'French Revolution Timeline',
    platform: 'YouTube',
    platformColor: '#FF0000',
    time: '18 min',
    thumbnail: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&h=200&fit=crop',
    timeAgo: '3d ago'
  },
];

class GLBErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean; message?: string }
> {
  state: { hasError: boolean; message?: string } = { hasError: false };

  static getDerivedStateFromError = () => ({ hasError: true });

  componentDidCatch(error: unknown) {
    // Surface the error in the UI (and console) so it isn't a silent blank/fallback.
    // eslint-disable-next-line no-console
    console.error('GLB render error:', error);
    const message = error instanceof Error ? error.message : String(error);
    this.setState({ message });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {this.props.fallback}
          <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/40 text-white text-xs px-3 py-2">
            3D model failed to load. Check DevTools console for details.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const userId = user?.id ?? null;
  const { gaps: topGaps, loading: gapsLoading } = useTopGaps(3);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const [mascotReady, setMascotReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [avatarExists, setAvatarExists] = useState<boolean | null>(null);
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [bubbleIndex, setBubbleIndex] = useState(0);
  const [bubbleTriggered, setBubbleTriggered] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(() => loadChatHistory(null));
  const [chatLoading, setChatLoading] = useState(false);
  const [youtubeHistoryCount, setYoutubeHistoryCount] = useState<number | null>(null);
  const [insightCards, setInsightCards] = useState<Array<{ title: string; subtitle: string; progress: number; synthesisId?: string }>>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(false);
  const [hasSyntheses, setHasSyntheses] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setHasSyntheses(null);
      setInsightCards([]);
      setInsightsLoading(false);
      return;
    }
    let cancelled = false;
    setInsightsLoading(true);
    setInsightsError(false);
    (async () => {
      try {
        const listRes = await fetch('/api/syntheses-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (cancelled) return;
        const listData = (await listRes.json()) as { items?: unknown[] };
        const items = Array.isArray(listData?.items) ? listData.items : [];
        if (items.length === 0) {
          setHasSyntheses(false);
          setInsightCards([]);
          setInsightsLoading(false);
          return;
        }
        setHasSyntheses(true);
        const insightsRes = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (cancelled) return;
        if (!insightsRes.ok) {
          setInsightsError(true);
          setInsightCards([]);
          setInsightsLoading(false);
          return;
        }
        const insightsData = (await insightsRes.json()) as { cards?: Array<{ title?: string; subtitle?: string; progress?: number; synthesisId?: string }> };
        const cards = Array.isArray(insightsData?.cards) ? insightsData.cards : [];
        setInsightCards(
          cards.map((c) => ({
            title: typeof c.title === 'string' ? c.title : 'Keep going!',
            subtitle: typeof c.subtitle === 'string' ? c.subtitle : '',
            progress: typeof c.progress === 'number' && c.progress >= 0 && c.progress <= 100 ? c.progress : 50,
            synthesisId: typeof c.synthesisId === 'string' ? c.synthesisId : undefined,
          }))
        );
      } catch {
        if (!cancelled) {
          setInsightsError(true);
          setHasSyntheses(null);
          setInsightCards([]);
        }
      } finally {
        if (!cancelled) setInsightsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    getToken()
      .then((token) => {
        if (!token) return;
        return fetch('/api/youtube-watch-history', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      })
      .then((res) => (res?.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.history) ? data.history : [];
        setYoutubeHistoryCount(list.length);
      })
      .catch(() => {
        if (!cancelled) setYoutubeHistoryCount(0);
      });
    return () => { cancelled = true; };
  }, [getToken]);

  useEffect(() => {
    if (userId === null) return;
    getToken()
      .then((t) => {
        if (!t) {
          setMessages(loadChatHistory(userId));
          return;
        }
        return fetch('/api/chat-messages', { method: 'GET', headers: { Authorization: `Bearer ${t}` } })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (Array.isArray(d?.messages) && d.messages.length > 0) {
              setMessages(d.messages as { role: 'user' | 'assistant'; content: string }[]);
            } else {
              setMessages(loadChatHistory(userId));
            }
          })
          .catch(() => setMessages(loadChatHistory(userId)));
      })
      .catch(() => setMessages(loadChatHistory(userId)));
  }, [userId, getToken]);

  useEffect(() => {
    if (messages.length > 0) saveChatHistory(userId, messages);
  }, [messages, userId]);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || chatLoading) return;

    const userContent = inputText.trim();
    const userMessage = { role: 'user' as const, content: userContent };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputText('');
    setChatLoading(true);

    try {
      const token = await getToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error ?? 'Something went wrong'}` },
        ]);
        return;
      }

      const content = typeof data.content === 'string' ? data.content : '';
      const assistantMessage = { role: 'assistant' as const, content: content || 'No response.' };
      setMessages((prev) => [...prev, assistantMessage]);

      if (token) {
        fetch('/api/chat-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: [userMessage, assistantMessage] }),
        }).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${message}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, getToken, messages]);

  // Show Brain placeholder for 2 sec before revealing 3D mascot
  useEffect(() => {
    const t = setTimeout(() => setMascotReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // Cycle bubble messages every 4 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setBubbleIndex((i) => (i + 1) % mascotBubbleMessages.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Check whether a custom avatar image exists in public/chatbot/avatar.png
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    async function check() {
      try {
        let res = await fetch('/chatbot/avatar.png', { method: 'HEAD', signal: controller.signal });
        if (!res.ok) {
          res = await fetch('/chatbot/avatar.png', { method: 'GET', signal: controller.signal });
        }
        if (!mounted) return;
        setAvatarExists(res.ok);
      } catch (e) {
        if (!mounted) return;
        setAvatarExists(false);
      }
    }
    check();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* Floating AI Assistant Orb */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative cursor-pointer group animate-float"
              onClick={() => {
                setChatOpen(true);
                setShowAI(false);
              }}
            >
              {/* Pulsing rings */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff8c42] opacity-40 blur-xl animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff8c42] opacity-20 blur-2xl animate-pulse" />
              
              {/* Main orb */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#ffb347] via-[#ff8c42] to-[#ff6b35] shadow-2xl shadow-[#ffb347]/50 flex items-center justify-center border-2 border-white/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              {/* Tooltip */}
              <div className="absolute -top-12 right-0 px-3 py-2 bg-card rounded-lg border border-border shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="text-xs text-foreground font-semibold">AI Assistant</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section - Floating AI Character */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffb347]/10 via-[#ff8c42]/10 to-[#ff6b35]/10 min-h-[500px] md:min-h-[600px]"
      >
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffb347]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ff8c42]/5 rounded-full blur-2xl" />
        
        {/* Mascot Character */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.2 
            }}
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.3 }
            }}
            className="relative"
          >
            {/* Floating bubbles – no speech tails, bubble style */}
            <AnimatePresence mode="wait">
              <motion.div
                key={bubbleIndex}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute -top-2 -left-4 md:-left-8 z-10 max-w-[180px] md:max-w-[220px] animate-float cursor-pointer"
                onClick={() => setBubbleTriggered(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setBubbleTriggered(true)}
              >
                <div className="relative px-4 py-3 rounded-3xl bg-white/90 dark:bg-slate-800/90 border-2 border-white/60 shadow-[0_8px_32px_rgba(255,140,66,0.25),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_12px_40px_rgba(255,140,66,0.35)] transition-shadow">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {mascotBubbleMessages[bubbleIndex]}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.div
                key={`bubble2-${bubbleIndex}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
                className="absolute -bottom-4 -right-4 md:-right-8 z-10 max-w-[160px] md:max-w-[200px] animate-float cursor-pointer"
                onClick={() => setBubbleTriggered(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setBubbleTriggered(true)}
              >
                <div className="relative px-4 py-2.5 rounded-3xl bg-white/90 dark:bg-slate-800/90 border-2 border-white/60 shadow-[0_8px_32px_rgba(255,140,66,0.25),inset_0_1px_0_rgba(255,255,255,0.8)] hover:shadow-[0_12px_40px_rgba(255,140,66,0.35)] transition-shadow">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {mascotBubbleMessages[(bubbleIndex + 1) % mascotBubbleMessages.length]}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
            {/* 3D chatbot mascot – model at public/bot */}
            <div className="relative w-80 h-80 md:w-[500px] md:h-[500px] flex items-center justify-center overflow-hidden">
              <GLBErrorBoundary fallback={<Brain className="w-32 h-32 md:w-48 md:h-48 text-white/90" />}>
                <div className="absolute inset-0 w-full h-full">
                  {mascotReady ? (
                    <ChatbotGLB
                      urls={bubbleTriggered ? ['/bot/Bear_Backflip.glb', '/bot/Bear_Hello.glb'] : ['/bot/Bear_Walking.glb', '/bot/Bear_Running.glb']}
                      loopCount={bubbleTriggered ? 3 : undefined}
                      onLoopComplete={bubbleTriggered ? () => setBubbleTriggered(false) : undefined}
                      scale={1.2}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Brain className="w-24 h-24 md:w-32 md:h-32 text-white/50 animate-pulse" />
                    </div>
                  )}
                </div>
              </GLBErrorBoundary>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Connected Platforms */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Connected Tools</h2>
          <button className="text-[#ffb347] hover:text-[#ff8c42] flex items-center gap-1 font-semibold transition-colors">
            Manage
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((platform, index) => {
            const Icon = platform.icon;
            return (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (platform.path) navigate(platform.path);
                }}
                className={`relative overflow-hidden rounded-2xl bg-card border-2 ${platform.borderColor} p-6 cursor-pointer group hover:shadow-lg hover:shadow-black/20 transition-all`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${platform.bgColor} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${platform.bgColor} rounded-xl flex items-center justify-center border ${platform.borderColor}`}>
                      <Icon className="w-6 h-6" style={{ color: platform.color }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        platform.status === 'synced' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`} />
                      <span className={`text-xs font-semibold ${
                        platform.status === 'synced' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {platform.status === 'synced' ? 'Synced' : 'Syncing...'}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-foreground mb-1">{platform.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {platform.name === 'YouTube'
                      ? youtubeHistoryCount !== null
                        ? `${youtubeHistoryCount} items`
                        : '… items'
                      : `${platform.items} items`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* AI Insights - Motivational Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ffb347] to-[#ff8c42] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">AI Insights</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insightsLoading && (
            <div className="md:col-span-3 rounded-2xl bg-card border border-slate-200 p-8 text-center text-muted-foreground">
              Loading insights…
            </div>
          )}
          {!insightsLoading && insightsError && (
            <div className="md:col-span-3 rounded-2xl bg-card border border-slate-200 p-8 text-center text-muted-foreground">
              Could not load insights. Start by synthesizing a lecture.
              <motion.button
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/dashboard/synthesize')}
                className="mt-4 w-full max-w-xs mx-auto px-4 py-3 bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                Go to Synthesize
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          )}
          {!insightsLoading && !insightsError && hasSyntheses === false && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:col-span-3 rounded-2xl bg-card border border-slate-200 p-6 hover:border-[#ffb347]/50 transition-all shadow-sm"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-700" />
                    <circle cx="40" cy="40" r="32" stroke="url(#gradient-begin)" strokeWidth="6" fill="none" strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * 0.5}`} className="transition-all duration-1000" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="gradient-begin" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffb347" />
                        <stop offset="100%" stopColor="#ff8c42" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-amber-400">0%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground mb-1 text-lg">Begin your journey here!</h3>
                  <p className="text-sm text-muted-foreground">Upload a lecture to synthesize and get personalized insights.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard/synthesize')}
                  className="flex-1 min-w-[140px] px-4 py-3 bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  Continue Learning
                </motion.button>
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard/gaps')}
                  className="flex-1 min-w-[120px] px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  Fill Gap
                </motion.button>
                <motion.button
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/dashboard/coach')}
                  className="flex-1 min-w-[100px] px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                  Review
                </motion.button>
              </div>
            </motion.div>
          )}
          {!insightsLoading && !insightsError && hasSyntheses === true && insightCards.length === 0 && (
            <div className="md:col-span-3 rounded-2xl bg-card border border-slate-200 p-6 text-center">
              <p className="text-muted-foreground mb-4">Your syntheses are ready. Keep learning!</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <motion.button whileHover={{ x: 4 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/dashboard/synthesize')} className="px-4 py-3 bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">Continue Learning</motion.button>
                <motion.button whileHover={{ x: 4 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/dashboard/gaps')} className="px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold">Fill Gap</motion.button>
                <motion.button whileHover={{ x: 4 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/dashboard/coach')} className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold">Review</motion.button>
              </div>
            </div>
          )}
          {!insightsLoading && !insightsError && hasSyntheses === true && insightCards.length > 0 && insightCards.map((insight, index) => {
            const style = INSIGHT_CARD_GRADIENTS[index % INSIGHT_CARD_GRADIENTS.length];
            const gradId = `insight-grad-${index}`;
            return (
              <motion.div
                key={`${insight.title}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.03, y: -6 }}
                className="relative overflow-hidden rounded-2xl bg-card border border-slate-200 p-6 hover:border-[#ffb347]/50 transition-all group shadow-sm"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-700" />
                      <circle cx="40" cy="40" r="32" stroke={`url(#${gradId})`} strokeWidth="6" fill="none" strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - insight.progress / 100)}`} className="transition-all duration-1000" strokeLinecap="round" />
                      <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={style.stopColors[0]} />
                          <stop offset="100%" stopColor={style.stopColors[1]} />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold ${style.progressColor}`}>{insight.progress}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-1 text-lg">{insight.title}</h3>
                    <p className="text-sm text-muted-foreground">{insight.subtitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/dashboard/synthesize', insight.synthesisId ? { state: { openSynthesisId: insight.synthesisId } } : undefined)}
                    className={`flex-1 min-w-[140px] px-4 py-3 bg-gradient-to-r ${style.bgGradient} text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg`}
                  >
                    Continue Learning
                  </motion.button>
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/dashboard/gaps')}
                    className="flex-1 min-w-[120px] px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    Fill Gap
                  </motion.button>
                  <motion.button
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/dashboard/coach')}
                    className="flex-1 min-w-[100px] px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                  >
                    Review
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Knowledge Graph + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Graph Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 rounded-2xl bg-card border border-slate-200 p-6 hover:border-cyan-500/50 transition-all group shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                <Network className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Knowledge Graph</h2>
            </div>
            <motion.button
              whileHover={{ x: 4 }}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors"
            >
              Explore
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>

          <KnowledgeGraph />
        </motion.div>

      {/* Quick Stats + Gaps Preview */}
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl bg-card border border-slate-200 p-6 space-y-4 shadow-sm"
        >
          <h3 className="mb-6 font-bold text-foreground">This Week</h3>

          <div className="space-y-4">
            <div className="rounded-xl border border-[#ffb347]/20 bg-gradient-to-br from-[#ffb347]/10 to-[#ff8c42]/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Study Time</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-foreground">12.5h</p>
              <p className="mt-1 text-xs font-semibold text-emerald-400">
                +25% from last week
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Topics Mastered</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-foreground">7</p>
              <p className="mt-1 text-xs font-semibold text-amber-400">
                3 more to go!
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Gaps Closed</span>
                <Flame className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-foreground">3</p>
              <p className="mt-1 text-xs font-semibold text-[#ffb347]">
                Keep the momentum!
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl bg-card border border-slate-200 p-4 space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#ffb347]" />
              <h3 className="text-sm font-bold text-foreground">Top gaps to close</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard/gaps")}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#ffb347] hover:text-[#ff8c42]"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          {gapsLoading ? (
            <p className="text-xs text-muted-foreground">Scanning your syntheses…</p>
          ) : topGaps.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Synthesize some materials to surface your knowledge gaps.
            </p>
          ) : (
            <ul className="space-y-2">
              {topGaps.map((gap) => (
                <li
                  key={gap.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-foreground dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <p className="line-clamp-2 font-medium">{gap.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                    {gap.topics.slice(0, 2).map((t) => (
                      <span
                        key={t.id}
                        className="rounded-full border border-[#ffb347]/30 bg-[#ffb347]/10 px-2 py-0.5"
                      >
                        {t.label}
                      </span>
                    ))}
                    {gap.topics.length > 2 && (
                      <span className="text-[11px] text-muted-foreground">
                        +{gap.topics.length - 2} more
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
      </div>

      {/* Recent Across Platforms - Horizontal Scroll */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Recent Across Platforms</h2>
          <button className="text-[#ffb347] hover:text-[#ff8c42] flex items-center gap-1 font-semibold transition-colors">
            View All
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {recentActivity.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              whileHover={{ scale: 1.05, y: -8 }}
              className="flex-shrink-0 w-[280px] rounded-2xl bg-card border border-slate-200 overflow-hidden hover:border-[#ffb347]/50 transition-all cursor-pointer group shadow-sm"
            >
              {/* Thumbnail */}
              <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                <img 
                  src={item.thumbnail} 
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
                  <span className="text-xs text-white font-semibold">{item.time}</span>
                </div>
                <div 
                  className="absolute top-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border"
                  style={{ 
                    backgroundColor: `${item.platformColor}20`,
                    borderColor: `${item.platformColor}40`
                  }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.platformColor }} />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h4 className="font-bold text-foreground mb-2 line-clamp-2">{item.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-semibold">{item.platform}</span>
                  <span className="text-xs text-slate-500">{item.timeAgo}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Motivational Quote / AI Assistant Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#ffb347]/20 via-[#ff8c42]/20 to-[#ff6b35]/20 border border-[#ffb347]/30 p-6 text-center"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#ffb347]/20 rounded-full blur-3xl" />
        <div className="relative">
          <Sparkles className="w-8 h-8 text-[#ffb347] mx-auto mb-3" />
          <p className="text-lg text-foreground/90 font-medium italic">
            "Every expert was once a beginner. Keep learning, keep growing."
          </p>
          <p className="text-sm text-muted-foreground mt-2">Your AI learning companion is always here to help 🧡</p>
        </div>
      </motion.div>

      {/* AI Chatbot Modal */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setChatOpen(false);
              setShowAI(true);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl h-[600px] bg-card rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="relative overflow-hidden bg-gradient-to-r from-[#ffb347] via-[#ff8c42] to-[#ff6b35] p-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-white">AI assistant</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setChatOpen(false);
                      setShowAI(true);
                    }}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white'
                          : 'bg-slate-100 text-slate-900 border border-slate-200'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-[#ffb347]" />
                          <span className="text-xs font-bold text-[#ffb347]">AI Assistant</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
                {chatLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] rounded-2xl p-4 bg-slate-100 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-[#ffb347]" />
                        <span className="text-xs font-bold text-[#ffb347]">AI Assistant</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#ffb347] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="inline-block w-2 h-2 rounded-full bg-[#ffb347] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="inline-block w-2 h-2 rounded-full bg-[#ffb347] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Quick Action Buttons - hidden when typing */}
              {!inputFocused && !inputText.trim() && !chatLoading && (
                <div className="px-6 pb-3">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => setInputText("What files do I have in my library?")}
                      className="flex-shrink-0 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                    >
                      📁 My files
                    </button>
                    <button
                      onClick={() => setInputText("List my syntheses")}
                      className="flex-shrink-0 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-xl text-xs font-semibold transition-colors"
                    >
                      📄 My syntheses
                    </button>
                    <button
                      onClick={() => setInputText("Search my library for...")}
                      className="flex-shrink-0 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      🔍 Search library
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-6 pt-3 border-t border-slate-200 bg-slate-50/50">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about your files, syntheses, or search your library..."
                    className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#ffb347] rounded-xl text-sm text-foreground placeholder-slate-400 outline-none transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: chatLoading ? 1 : 1.05 }}
                    whileTap={{ scale: chatLoading ? 1 : 0.95 }}
                    onClick={handleSendMessage}
                    disabled={chatLoading}
                    className="px-6 py-3 bg-gradient-to-r from-[#ffb347] to-[#ff8c42] hover:from-[#ff8c42] hover:to-[#ff6b35] text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    {chatLoading ? 'Sending...' : 'Send'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}