import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useState } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
const LOGO_SVG = '/company_logo/logo1.png';
const LOGO_PNG = '/company_logo/logo1.png';
import { 
  LayoutDashboard, 
  Search, 
  Network, 
  TrendingDown, 
  Calendar, 
  Link2, 
  Sparkles,
  Flame,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/dashboard/synthesize', label: 'Synthesize', icon: Sparkles },
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
  const handleSignOut = () => {
    setProfileOpen(false);
    signOut(() => navigate('/login'));
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoSrc, setLogoSrc] = useState(LOGO_SVG);
  const showLogo = !logoError;
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
        <div className="p-6 border-b border-sidebar-border flex items-center min-h-[52px]">
          {showLogo ? (
            <img
              src={logoSrc}
              alt="Company logo"
              className="max-h-8 w-auto object-contain object-left"
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
            {/* Streak Badge */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl border border-orange-500/30">
              <Flame className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-foreground">12 days</span>
            </div>

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
    </div>
  );
}