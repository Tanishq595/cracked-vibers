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
import { useState, useEffect, useRef, Component, useCallback, type ReactNode } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate, useSearchParams } from 'react-router';
import { KnowledgeGraph } from "../components/KnowledgeGraph";
import { ChatbotGLB } from "../components/ChatbotGLB";
import { useNavigate, Link } from "react-router";
import { useTopGaps } from "./GapAnalysis";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';

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
  { name: 'Google Classroom', icon: BookOpen, color: '#34A853', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', status: 'synced', items: 142, path: '/dashboard/classroom' },
  { name: 'Notion', icon: FileText, color: '#000000', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', status: 'synced', items: 89, path: '/dashboard/notion' },
  { name: 'YouTube', icon: Youtube, color: '#FF0000', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', status: 'synced', items: 0, path: '/dashboard/youtube' },
  { name: 'Canvas', icon: Circle, color: '#E13F2F', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', status: 'syncing', items: 67 },
];

function PlatformIcon({ name, className }: { name: string; className?: string }) {
  const c = className ?? "w-6 h-6";
  if (name === "Google Classroom") {
    return (
      <svg className={c} viewBox="0 0 578.9 500" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="gc-linear-1" gradientUnits="userSpaceOnUse" x1="154.8649" y1="295.747" x2="154.8649" y2="282.6343" gradientTransform="matrix(12.992 0 0 -4 -1584.6235 1631.0867)">
            <stop offset="0" stopColor="#BF360C" stopOpacity="0.2" />
            <stop offset="1" stopColor="#BF360C" stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="gc-radial-1" cx="131.4012" cy="367.2001" r="18.1966" gradientTransform="matrix(38.0002 0 0 -38 -4973.3276 13965.3232)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.1" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path fill="#0F9D58" d="M52.6,52.6h473.7v394.7H52.6V52.6z" />
        <path fill="#57BB8A" d="M394.7,263.2c16.4,0,29.6-13.3,29.6-29.6s-13.3-29.6-29.6-29.6s-29.6,13.3-29.6,29.6 S378.4,263.2,394.7,263.2L394.7,263.2z M394.7,282.9c-31.7,0-65.8,16.8-65.8,37.6v21.6h131.6v-21.6 C460.5,299.7,426.4,282.9,394.7,282.9z M184.2,263.2c16.4,0,29.6-13.3,29.6-29.6s-13.3-29.6-29.6-29.6s-29.6,13.3-29.6,29.6 S167.9,263.2,184.2,263.2L184.2,263.2z M184.2,282.9c-31.7,0-65.8,16.8-65.8,37.6v21.6H250v-21.6 C250,299.7,215.9,282.9,184.2,282.9z" />
        <path fill="#F7F7F7" d="M289.5,236.8c21.8,0,39.5-17.7,39.4-39.5c0-21.8-17.7-39.5-39.5-39.4c-21.8,0-39.4,17.7-39.4,39.5 C250,219.2,267.7,236.8,289.5,236.8z M289.5,263.2c-44.4,0-92.1,23.6-92.1,52.6v26.3h184.2v-26.3 C381.6,286.7,333.9,263.2,289.5,263.2z" />
        <path fill="#F1F1F1" d="M342.1,421.1h118.4v26.3H342.1V421.1z" />
        <path fill="#F4B400" d="M539.5,0h-500C17.7,0,0,17.7,0,39.5v421.1C0,482.3,17.7,500,39.5,500h500c21.8,0,39.5-17.7,39.5-39.5V39.5 C578.9,17.7,561.3,0,539.5,0z M526.3,447.4H52.6V52.6h473.7V447.4z" />
        <path opacity="0.2" fill="#FFFFFF" d="M539.5,0h-500C17.7,0,0,17.7,0,39.5v3.3C0,21,17.7,3.3,39.5,3.3 h500c21.8,0,39.5,17.7,39.5,39.5v-3.3C578.9,17.7,561.3,0,539.5,0z" />
        <path opacity="0.2" fill="#BF360C" d="M539.5,496.7h-500C17.7,496.7,0,479,0,457.2v3.3 C0,482.3,17.7,500,39.5,500h500c21.8,0,39.5-17.7,39.5-39.5v-3.3C578.9,479,561.3,496.7,539.5,496.7z" />
        <path fill="url(#gc-linear-1)" d="M460.3,447.4H341.9l52.6,52.6h118.3L460.3,447.4z" />
        <path opacity="0.2" fill="#263238" d="M52.6,49.3h473.7v3.3H52.6V49.3z" />
        <path opacity="0.2" fill="#FFFFFF" d="M52.6,447.4h473.7v3.3H52.6V447.4z" />
        <path fill="url(#gc-radial-1)" d="M539.5,0h-500C17.7,0,0,17.7,0,39.5v421.1C0,482.3,17.7,500,39.5,500h500 c21.8,0,39.5-17.7,39.5-39.5V39.5C578.9,17.7,561.3,0,539.5,0z" />
      </svg>
    );
  }
  if (name === "Notion") {
    return (
      <svg className={c} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path fillRule="evenodd" clipRule="evenodd" d="M5.716 29.2178L2.27664 24.9331C1.44913 23.9023 1 22.6346 1 21.3299V5.81499C1 3.86064 2.56359 2.23897 4.58071 2.10125L20.5321 1.01218C21.691 0.933062 22.8428 1.24109 23.7948 1.8847L29.3992 5.67391C30.4025 6.35219 31 7.46099 31 8.64426V26.2832C31 28.1958 29.4626 29.7793 27.4876 29.9009L9.78333 30.9907C8.20733 31.0877 6.68399 30.4237 5.716 29.2178Z" fill="white" />
        <path d="M11.2481 13.5787V13.3756C11.2481 12.8607 11.6605 12.4337 12.192 12.3982L16.0633 12.1397L21.417 20.0235V13.1041L20.039 12.9204V12.824C20.039 12.303 20.4608 11.8732 20.9991 11.8456L24.5216 11.6652V12.1721C24.5216 12.41 24.3446 12.6136 24.1021 12.6546L23.2544 12.798V24.0037L22.1906 24.3695C21.3018 24.6752 20.3124 24.348 19.8036 23.5803L14.6061 15.7372V23.223L16.2058 23.5291L16.1836 23.6775C16.1137 24.1423 15.7124 24.4939 15.227 24.5155L11.2481 24.6926C11.1955 24.1927 11.5701 23.7456 12.0869 23.6913L12.6103 23.6363V13.6552L11.2481 13.5787Z" fill="#000000" />
        <path fillRule="evenodd" clipRule="evenodd" d="M20.6749 2.96678L4.72347 4.05585C3.76799 4.12109 3.02734 4.88925 3.02734 5.81499V21.3299C3.02734 22.1997 3.32676 23.0448 3.87843 23.7321L7.3178 28.0167C7.87388 28.7094 8.74899 29.0909 9.65435 29.0352L27.3586 27.9454C28.266 27.8895 28.9724 27.1619 28.9724 26.2832V8.64426C28.9724 8.10059 28.6979 7.59115 28.2369 7.27951L22.6325 3.49029C22.0613 3.10413 21.3702 2.91931 20.6749 2.96678ZM5.51447 6.057C5.29261 5.89274 5.3982 5.55055 5.6769 5.53056L20.7822 4.44711C21.2635 4.41259 21.7417 4.54512 22.1309 4.82088L25.1617 6.96813C25.2767 7.04965 25.2228 7.22563 25.0803 7.23338L9.08387 8.10336C8.59977 8.12969 8.12193 7.98747 7.73701 7.7025L5.51447 6.057ZM8.33357 10.8307C8.33357 10.311 8.75341 9.88177 9.29027 9.85253L26.203 8.93145C26.7263 8.90296 27.1667 9.30534 27.1667 9.81182V25.0853C27.1667 25.604 26.7484 26.0328 26.2126 26.0633L9.40688 27.0195C8.8246 27.0527 8.33357 26.6052 8.33357 26.0415V10.8307Z" fill="#000000" />
      </svg>
    );
  }
  if (name === "YouTube") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FF0000"/>
      </svg>
    );
  }
  if (name === "Canvas") {
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="#E13F2F" />
        <path fill="#fff" fillRule="evenodd" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    );
  }
  return null;
}

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
  const [youtubeConnected, setYoutubeConnected] = useState<boolean | null>(null);
  const [classroomCourseCount, setClassroomCourseCount] = useState<number | null>(null);
  const [classroomConnected, setClassroomConnected] = useState<boolean | null>(null);
  const [notionPageCount, setNotionPageCount] = useState<number | null>(null);
  const [notionConnected, setNotionConnected] = useState<boolean | null>(null);
  const [insightCards, setInsightCards] = useState<Array<{ title: string; subtitle: string; progress: number; synthesisId?: string }>>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(false);
  const [hasSyntheses, setHasSyntheses] = useState<boolean | null>(null);

  const [graphData, setGraphData] = useState<{ nodes: Array<{ id: string; label: string }>; edges: Array<{ from: string; to: string; type?: string }> } | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const graphBackfillTriggered = useRef(false);

  const fetchGraph = useCallback((): Promise<{ nodes: Array<{ id: string; label: string }>; edges: Array<{ from: string; to: string; type?: string }> }> => {
    if (!userId) return Promise.resolve({ nodes: [], edges: [] });
    return fetch('/api/knowledge-graph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
      .then((r) => r.json())
      .then((d) => {
        const nodes = Array.isArray(d?.nodes) ? d.nodes : [];
        const edges = Array.isArray(d?.edges) ? d.edges : [];
        return { nodes, edges };
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setGraphData(null);
      setGraphLoading(false);
      return;
    }
    let cancelled = false;
    setGraphLoading(true);
    fetchGraph()
      .then((payload) => {
        if (cancelled) return;
        setGraphData(payload);
        if (payload.nodes.length === 0 && !graphBackfillTriggered.current) {
          graphBackfillTriggered.current = true;
          if (!cancelled) setGraphLoading(true);
          fetch('/api/knowledge-graph-backfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          })
            .then((r) => r.json())
            .then((backfill) => {
              if (cancelled) return;
              if (backfill?.ok && backfill?.merged > 0) {
                return fetchGraph().then((p) => {
                  if (!cancelled) setGraphData(p);
                });
              }
            })
            .catch(() => {})
            .finally(() => {
              if (!cancelled) setGraphLoading(false);
            });
        }
      })
      .catch(() => {
        if (!cancelled) setGraphData(null);
      })
      .finally(() => {
        if (!cancelled) setGraphLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, fetchGraph]);

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
    let cancelled = false;
    getToken()
      .then((token) => {
        if (!token) {
          setYoutubeConnected(false);
          return;
        }
        return fetch('/api/youtube-data', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      })
      .then((res) => (res?.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setYoutubeConnected(data?.connected === true);
      })
      .catch(() => {
        if (!cancelled) setYoutubeConnected(false);
      });
    return () => { cancelled = true; };
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/google-classroom-data', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { connected: false }))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.courses) ? data.courses : [];
        setClassroomConnected(data?.connected === true);
        setClassroomCourseCount(data?.connected ? list.length : 0);
      })
      .catch(() => {
        if (!cancelled) {
          setClassroomConnected(false);
          setClassroomCourseCount(0);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getToken()
      .then((token) => {
        if (!token) {
          setNotionConnected(false);
          return;
        }
        return fetch('/api/notion-data', { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
      })
      .then((res) => (res?.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setNotionConnected(data?.connected === true);
        const pages = Array.isArray(data?.pages) ? data.pages : [];
        setNotionPageCount(data?.connected ? pages.length : 0);
      })
      .catch(() => {
        if (!cancelled) {
          setNotionConnected(false);
          setNotionPageCount(0);
        }
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

  // Canvas connect state
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasCourses, setCanvasCourses] = useState<{ id: number; name: string; course_code?: string }[]>([]);
  const [canvasSelectedCourseId, setCanvasSelectedCourseId] = useState<string | null>(null);
  const [canvasAssignments, setCanvasAssignments] = useState<{ id: number; name: string; description?: string; due_at?: string; points_possible?: number }[]>([]);
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const [canvasSynthesis, setCanvasSynthesis] = useState<string | null>(null);
  const [canvasAuthLoading, setCanvasAuthLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Clear ?canvas=connected or ?canvas=error from URL after showing once
  useEffect(() => {
    const canvasParam = searchParams.get('canvas');
    if (canvasParam === 'connected' || canvasParam === 'error') {
      const next = new URLSearchParams(searchParams);
      next.delete('canvas');
      next.delete('message');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSignInWithCanvas = async () => {
    setCanvasAuthLoading(true);
    setCanvasError(null);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) {
        setCanvasError('Please sign in first, then connect Canvas.');
        setCanvasAuthLoading(false);
        return;
      }
      // Form POST avoids fetch/auth-header issues: server gets token from body and redirects to Canvas
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/canvas/auth-url';
      form.style.display = 'none';
      const input = document.createElement('input');
      input.name = 'token';
      input.value = token;
      input.type = 'hidden';
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setCanvasError(err instanceof Error ? err.message : 'Failed to connect to Canvas');
      setCanvasAuthLoading(false);
    }
  };

  const fetchCanvasCourses = async () => {
    setCanvasLoading(true);
    setCanvasError(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/canvas/fetch?type=courses', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to fetch courses');
      setCanvasCourses(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setCanvasError(
        err instanceof Error ? err.message : 'Canvas connection failed. Sign in with Canvas first.'
      );
    } finally {
      setCanvasLoading(false);
    }
  };

  const fetchCanvasAssignments = async (courseId: string) => {
    setCanvasLoading(true);
    setCanvasError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/canvas/fetch?type=assignments&courseId=${courseId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? 'Failed to fetch assignments');
      setCanvasAssignments(Array.isArray(json.data) ? json.data : []);
      setCanvasSelectedCourseId(courseId);
    } catch (err) {
      setCanvasError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setCanvasLoading(false);
    }
  };

  const handleSynthesizeWithCanvas = async () => {
    if (!canvasSelectedCourseId || canvasAssignments.length === 0) {
      setCanvasError('Select a course and load assignments first');
      return;
    }
    setCanvasLoading(true);
    setCanvasError(null);
    setCanvasSynthesis(null);
    try {
      const canvasText = canvasAssignments
        .map(
          (a) =>
            `Assignment: ${a.name}\n` +
            `Description: ${(a.description ?? '').replace(/<[^>]+>/g, '') || 'No description'}\n` +
            `Due: ${a.due_at ?? 'No due date'}\n` +
            `Points: ${a.points_possible ?? 'N/A'}`
        )
        .join('\n\n');
      const fullMaterials = `Canvas course data:\n${canvasText}`;
      const synthRes = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: fullMaterials }),
      });
      if (!synthRes.ok) throw new Error('Synthesis failed');
      const synthJson = await synthRes.json();
      setCanvasSynthesis(synthJson.markdown ?? synthJson.result ?? '');
    } catch (err) {
      setCanvasError(err instanceof Error ? err.message : 'Failed to synthesize');
    } finally {
      setCanvasLoading(false);
    }
  };

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
            const isCanvas = platform.name === 'Canvas';
            const useBrandSvg = ['Google Classroom', 'Notion', 'YouTube'].includes(platform.name);
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
                  else if (isCanvas) setCanvasOpen(true);
                }}
                className={`relative overflow-hidden rounded-2xl bg-card border-2 ${platform.borderColor} p-6 cursor-pointer group hover:shadow-lg hover:shadow-black/20 transition-all`}
                role={isCanvas ? 'button' : undefined}
                tabIndex={isCanvas ? 0 : undefined}
                onKeyDown={isCanvas ? (e) => e.key === 'Enter' && setCanvasOpen(true) : undefined}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${platform.bgColor} rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 ${platform.bgColor} rounded-xl flex items-center justify-center border ${platform.borderColor}`}>
                      {useBrandSvg ? (
                        <PlatformIcon name={platform.name} className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" style={{ color: platform.color }} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const connected = platform.name === 'YouTube'
                          ? youtubeConnected
                          : platform.name === 'Google Classroom'
                            ? classroomConnected
                            : platform.name === 'Notion'
                              ? notionConnected
                              : platform.status === 'synced';
                        const isSynced = connected === true;
                        const isChecking = connected === null && (platform.name === 'YouTube' || platform.name === 'Google Classroom' || platform.name === 'Notion');
                        return (
                          <>
                            <div className={`w-2 h-2 rounded-full ${
                              isSynced ? 'bg-emerald-500' : isChecking ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                            }`} />
                            <span className={`text-xs font-semibold ${
                              isSynced ? 'text-emerald-400' : isChecking ? 'text-amber-400' : 'text-muted-foreground'
                            }`}>
                              {isSynced ? 'Synced' : isChecking ? 'Checking...' : 'Not connected'}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-foreground mb-1">{platform.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {platform.name === 'YouTube'
                      ? youtubeHistoryCount !== null
                        ? `${youtubeHistoryCount} items`
                        : '… items'
                      : platform.name === 'Google Classroom'
                        ? classroomCourseCount !== null
                          ? `${classroomCourseCount} course${classroomCourseCount !== 1 ? 's' : ''}`
                          : '… courses'
                        : platform.name === 'Notion'
                          ? notionPageCount !== null
                            ? `${notionPageCount} page${notionPageCount !== 1 ? 's' : ''}`
                            : '… pages'
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
                className="relative overflow-hidden rounded-2xl bg-card border border-slate-200 p-6 hover:border-[#ffb347]/50 transition-all group shadow-sm flex flex-col h-full"
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
                    className={`flex-1 min-w-[140px] px-4 py-3 bg-gradient-to-r ${style.bgGradient} text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg mt-auto`}
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
            <Link
              to="/dashboard/knowledge-graph"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors"
            >
              Explore
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {graphLoading ? (
            <div className="h-[420px] flex items-center justify-center text-muted-foreground">Loading graph…</div>
          ) : graphData && graphData.nodes.length > 0 ? (
            <div className="h-[420px] w-full">
              <KnowledgeGraph data={graphData} />
            </div>
          ) : (
            <div className="h-[420px] flex items-center justify-center text-muted-foreground rounded-xl bg-muted/30 border border-dashed border-border">
              Create a synthesis to build your knowledge graph.
            </div>
          )}
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
                <div className="absolute top-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center bg-white/90 backdrop-blur-sm border border-white/20 shadow-sm">
                  <PlatformIcon name={item.platform === 'Classroom' ? 'Google Classroom' : item.platform} className="w-5 h-5" />
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

      {/* Canvas Connect Dialog */}
      <Dialog open={canvasOpen} onOpenChange={setCanvasOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connect Canvas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in with your Canvas account so we can access your courses and documents. After connecting, you can load courses and synthesize them with AI.
            </p>
            <Button
              onClick={handleSignInWithCanvas}
              disabled={canvasAuthLoading}
              className="bg-[#E13F2F] hover:bg-[#c23528] w-full sm:w-auto"
            >
              {canvasAuthLoading ? 'Redirecting...' : 'Sign in with Canvas'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Already connected? Load your courses below.
            </p>
            <Button
              variant="outline"
              onClick={fetchCanvasCourses}
              disabled={canvasLoading || canvasCourses.length > 0}
              className="border-[#E13F2F]/50 text-[#E13F2F] hover:bg-[#E13F2F]/10"
            >
              {canvasLoading && !canvasCourses.length ? 'Loading...' : 'Load My Canvas Courses'}
            </Button>
            {canvasError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {canvasError}
              </p>
            )}
            {canvasCourses.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {canvasCourses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => fetchCanvasAssignments(String(course.id))}
                    className={`rounded-lg border-2 p-4 text-left transition ${
                      canvasSelectedCourseId === String(course.id)
                        ? 'border-[#E13F2F] bg-[#E13F2F]/10'
                        : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    <h4 className="font-semibold text-foreground">{course.name}</h4>
                    <p className="text-xs text-muted-foreground">{course.course_code ?? 'No code'}</p>
                  </button>
                ))}
              </div>
            )}
            {canvasSelectedCourseId && canvasAssignments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Assignments in selected course</h4>
                <Button
                  onClick={handleSynthesizeWithCanvas}
                  disabled={canvasLoading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {canvasLoading ? 'Synthesizing...' : 'Synthesize This Course with AI'}
                </Button>
              </div>
            )}
            {canvasSynthesis && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-900 p-4">
                <h4 className="font-medium text-foreground mb-2">AI Synthesis Result</h4>
                <pre className="whitespace-pre-wrap text-sm text-foreground overflow-x-auto max-h-60 overflow-y-auto">
                  {canvasSynthesis}
                </pre>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate('/dashboard/synthesize')}
                >
                  Open in Synthesize
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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