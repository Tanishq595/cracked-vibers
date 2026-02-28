import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
const LOGO_SVG = '/company_logo/logo.png';
const LOGO_PNG = '/company_logo/logo.png';
import {
  LayoutDashboard,
  Search,
  Network,
  TrendingDown,
  TrendingUp,
  Calendar,
  Link2,
  Sparkles,
  Flame,
  Menu,
  X,
  LogOut,
  FolderOpen,
  Mic,
  Trophy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/dashboard/synthesize', label: 'Synthesize', icon: Sparkles },
  { path: '/dashboard/library', label: 'Library', icon: FolderOpen },
  { path: '/dashboard/coach', label: 'Speaking coach', icon: Mic },
  { path: '/dashboard/speaking-assessments', label: 'Assessments', icon: Trophy },
  { path: '/dashboard/search', label: 'Search', icon: Search },
  { path: '/dashboard/knowledge-graph', label: 'Graph', icon: Network },
  { path: '/dashboard/gaps', label: 'Gaps', icon: TrendingDown },
  { path: '/dashboard/planner', label: 'Planner', icon: Calendar },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [youtubeConnected, setYoutubeConnected] = useState<boolean | null>(null);
  const [classroomConnected, setClassroomConnected] = useState<boolean | null>(null);
  const [notionConnected, setNotionConnected] = useState<boolean | null>(null);

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
        setClassroomConnected(data?.connected === true);
      })
      .catch(() => {
        if (!cancelled) setClassroomConnected(false);
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
      })
      .catch(() => {
        if (!cancelled) setNotionConnected(false);
      });
    return () => { cancelled = true; };
  }, [getToken]);

  const platformsSyncedCount =
    (youtubeConnected === true ? 1 : 0) + (classroomConnected === true ? 1 : 0) + (notionConnected === true ? 1 : 0);

  const handleSignOut = () => {
    setProfileOpen(false);
    signOut(() => navigate('/login'));
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoSrc, setLogoSrc] = useState(LOGO_SVG);
  const showLogo = !logoError;

  // Login streak: record today once per session, then fetch streak + dates
  const [streakDays, setStreakDays] = useState<number | null>(null);
  const [loginDates, setLoginDates] = useState<string[]>([]);
  const [streakLoading, setStreakLoading] = useState(true);
  const [streakError, setStreakError] = useState(false);
  const [streakPopupOpen, setStreakPopupOpen] = useState(false);
  const streakRecordedThisSession = useRef(false);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) {
      setStreakLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setStreakLoading(true);
      setStreakError(false);
      try {
        if (!streakRecordedThisSession.current) {
          await fetch('/api/streak-record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid }),
          });
          streakRecordedThisSession.current = true;
        }
        const res = await fetch('/api/streak-get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid }),
        });
        if (cancelled) return;
        if (!res.ok) {
          setStreakError(true);
          setStreakDays(0);
          setLoginDates([]);
          return;
        }
        const data = (await res.json()) as { streakDays: number; loginDates: string[] };
        setStreakDays(data.streakDays ?? 0);
        setLoginDates(Array.isArray(data.loginDates) ? data.loginDates : []);
      } catch {
        if (!cancelled) {
          setStreakError(true);
          setStreakDays(0);
          setLoginDates([]);
        }
      } finally {
        if (!cancelled) setStreakLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  const handleLogoError = () => {
    if (logoSrc === LOGO_SVG) {
      setLogoSrc(LOGO_PNG);
    } else {
      setLogoError(true);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-card rounded-xl border-2 border-slate-200 hover:border-[#ffb347] transition-all shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar - Minimal */}
      <aside className={`w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col fixed lg:relative h-full z-40 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo - top left */}
        <div className="h-20 px-6 border-b border-sidebar-border flex items-center">
          {showLogo ? (
            <img
              src={logoSrc}
              alt="Company logo"
              className="max-h-11 w-auto object-contain object-left ml-1"
              onError={handleLogoError}
            />
          ) : (
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-[#ffb347] to-[#ff8c42] bg-clip-text text-transparent">
              M.U.S.T.Learn
            </span>
          )}
        </div>

        {/* Navigation - Icons + Labels */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative block"
                onClick={() => setSidebarOpen(false)}
              >
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#ffb347] text-white shadow-lg shadow-[#ffb347]/30'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Platform Status - YouTube & Google Classroom with real connection count */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-bold">Platforms</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <Link
                to="/dashboard/youtube"
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-red-500/50 transition-all shrink-0 ${
                  youtubeConnected === true
                    ? 'border-red-500/50 bg-red-500/10'
                    : 'border-sidebar-border bg-card opacity-70'
                }`}
                title={youtubeConnected === true ? 'YouTube connected' : 'YouTube'}
              >
                <svg viewBox="0 0 28.57 20" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z" fill="#FF0000" />
                  <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white" />
                </svg>
              </Link>
              <Link
                to="/dashboard/classroom"
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-emerald-500/50 transition-all shrink-0 ${
                  classroomConnected === true
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-sidebar-border bg-card opacity-70'
                }`}
                title={classroomConnected === true ? 'Google Classroom connected' : 'Google Classroom'}
              >
                <img
                  src="https://www.gstatic.com/classroom/logo_square_48.svg"
                  alt="Google Classroom"
                  className="w-5 h-5 object-contain"
                />
              </Link>
              <Link
                to="/dashboard/notion"
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-slate-500/50 transition-all shrink-0 ${
                  notionConnected === true
                    ? 'border-slate-500/50 bg-slate-500/10'
                    : 'border-sidebar-border bg-card opacity-70'
                }`}
                title={notionConnected === true ? 'Notion connected' : 'Notion'}
              >
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.716 29.2178L2.27664 24.9331C1.44913 23.9023 1 22.6346 1 21.3299V5.81499C1 3.86064 2.56359 2.23897 4.58071 2.10125L20.5321 1.01218C21.691 0.933062 22.8428 1.24109 23.7948 1.8847L29.3992 5.67391C30.4025 6.35219 31 7.46099 31 8.64426V26.2832C31 28.1958 29.4626 29.7793 27.4876 29.9009L9.78333 30.9907C8.20733 31.0877 6.68399 30.4237 5.716 29.2178Z" fill="white" />
                  <path d="M11.2481 13.5787V13.3756C11.2481 12.8607 11.6605 12.4337 12.192 12.3982L16.0633 12.1397L21.417 20.0235V13.1041L20.039 12.9204V12.824C20.039 12.303 20.4608 11.8732 20.9991 11.8456L24.5216 11.6652V12.1721C24.5216 12.41 24.3446 12.6136 24.1021 12.6546L23.2544 12.798V24.0037L22.1906 24.3695C21.3018 24.6752 20.3124 24.348 19.8036 23.5803L14.6061 15.7372V23.223L16.2058 23.5291L16.1836 23.6775C16.1137 24.1423 15.7124 24.4939 15.227 24.5155L11.2481 24.6926C11.1955 24.1927 11.5701 23.7456 12.0869 23.6913L12.6103 23.6363V13.6552L11.2481 13.5787Z" fill="#000000" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M20.6749 2.96678L4.72347 4.05585C3.76799 4.12109 3.02734 4.88925 3.02734 5.81499V21.3299C3.02734 22.1997 3.32676 23.0448 3.87843 23.7321L7.3178 28.0167C7.87388 28.7094 8.74899 29.0909 9.65435 29.0352L27.3586 27.9454C28.266 27.8895 28.9724 27.1619 28.9724 26.2832V8.64426C28.9724 8.10059 28.6979 7.59115 28.2369 7.27951L22.6325 3.49029C22.0613 3.10413 21.3702 2.91931 20.6749 2.96678ZM5.51447 6.057C5.29261 5.89274 5.3982 5.55055 5.6769 5.53056L20.7822 4.44711C21.2635 4.41259 21.7417 4.54512 22.1309 4.82088L25.1617 6.96813C25.2767 7.04965 25.2228 7.22563 25.0803 7.23338L9.08387 8.10336C8.59977 8.12969 8.12193 7.98747 7.73701 7.7025L5.51447 6.057ZM8.33357 10.8307C8.33357 10.311 8.75341 9.88177 9.29027 9.85253L26.203 8.93145C26.7263 8.90296 27.1667 9.30534 27.1667 9.81182V25.0853C27.1667 25.604 26.7484 26.0328 26.2126 26.0633L9.40688 27.0195C8.8246 27.0527 8.33357 26.6052 8.33357 26.0415V10.8307Z" fill="#000000" />
                </svg>
              </Link>
            </div>
            <span className="text-sm text-sidebar-foreground font-semibold">
              {youtubeConnected === null && classroomConnected === null && notionConnected === null
                ? '… synced'
                : `${platformsSyncedCount} synced`}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar - Minimal */}
        <header className="h-20 border-b border-border bg-card/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 lg:ml-0 ml-0">
          {/* Left side - empty or breadcrumb */}
          <div className="flex-1 lg:ml-0 ml-16">
            {/* Could add breadcrumb here */}
          </div>

          {/* Right side - Profile with Streak */}
          <div className="flex items-center gap-4">
            {/* Streak Badge - clickable, shows real streak */}
            <button
              type="button"
              onClick={() => setStreakPopupOpen(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl border border-orange-500/30 hover:from-orange-500/30 hover:to-amber-500/30 transition-colors cursor-pointer"
            >
              <Flame className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-foreground">
                {streakLoading ? '…' : streakError ? '—' : streakDays === 1 ? '1 day' : `${streakDays ?? 0} days`}
              </span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-card hover:bg-sidebar-accent rounded-xl cursor-pointer transition-all border border-border"
              >
                <div className="text-right hidden md:block">
                  <div className="text-sm font-bold text-foreground">{user?.firstName || user?.username || 'User'}</div>
                  <div className="text-xs text-muted-foreground font-medium">Student</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffb347] to-[#ff8c42] flex items-center justify-center text-lg font-bold text-white shadow-lg">
                  {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </div>
              </motion.div>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-card rounded-xl shadow-2xl border-2 border-border overflow-hidden z-50"
                  >
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sidebar-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-semibold">Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Streak popup: timeline of login days */}
      <AnimatePresence>
        {streakPopupOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setStreakPopupOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[80vh] bg-card rounded-2xl shadow-2xl border border-border z-[101] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Flame className="w-6 h-6 text-amber-400" />
                  <h2 className="text-lg font-bold text-foreground">Login streak</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStreakPopupOpen(false)}
                  className="p-2 rounded-lg hover:bg-sidebar-accent text-muted-foreground"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <p className="text-sm text-muted-foreground mb-4">
                  {streakLoading ? 'Loading…' : streakError ? 'Could not load streak.' : `You've logged in on ${loginDates.length} day${loginDates.length === 1 ? '' : 's'}. Current streak: ${streakDays ?? 0} day${(streakDays ?? 0) === 1 ? '' : 's'}.`}
                </p>
                {loginDates.length === 0 && !streakLoading && !streakError && (
                  <p className="text-sm text-muted-foreground">No login days recorded yet.</p>
                )}
                {loginDates.length > 0 && (
                  <ul className="space-y-2">
                    {loginDates.map((d) => (
                      <li key={d} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="font-mono text-foreground">{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}