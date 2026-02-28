import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
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
  Youtube,
  GraduationCap,
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
  { path: '/dashboard/youtube', label: 'YouTube', icon: Youtube },
  { path: '/dashboard/classroom', label: 'Classroom', icon: GraduationCap },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
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

        {/* Platform Status */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-bold">Platforms</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-500/20 border-2 border-slate-500/50 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              </div>
            </div>
            <span className="text-sm text-sidebar-foreground font-semibold">4 synced</span>
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