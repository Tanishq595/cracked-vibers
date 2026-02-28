import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Network, 
  TrendingDown, 
  Calendar, 
  Link2, 
  Sparkles,
  Flame,
  Circle,
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/synthesize', label: 'Synthesize', icon: Sparkles },
  { path: '/dashboard/search', label: 'Search', icon: Search },
  { path: '/dashboard/knowledge-graph', label: 'Knowledge Graph', icon: Network },
  { path: '/dashboard/gaps', label: 'Gap Analysis', icon: TrendingDown },
  { path: '/dashboard/planner', label: 'Planner', icon: Calendar },
];

const platforms = [
  { name: 'Notion', color: '#ffffff', status: 'connected' },
  { name: 'YouTube', color: '#FF0000', status: 'connected' },
  { name: 'Classroom', color: '#34A853', status: 'connected' },
  { name: 'Canvas', color: '#E13F2F', status: 'syncing' },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-400 transition-all shadow-md hover:shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6 text-slate-700" /> : <Menu className="w-6 h-6 text-slate-700" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Left Sidebar */}
      <aside className={`w-[280px] bg-white border-r border-slate-200 flex flex-col fixed lg:relative h-full z-40 transition-transform duration-300 shadow-sm ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-700 to-blue-700 flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-700 bg-clip-text text-transparent">
                M.U.S.T.Learn
              </h1>
              <p className="text-xs text-slate-500 font-medium">Knowledge OS</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative block"
              >
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : ''}`} />
                  <span className="font-semibold">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-indigo-50/50 rounded-xl -z-10"
                      transition={{ type: "spring", duration: 0.5 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Connected Platforms */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">Connected</span>
          </div>
          <div className="space-y-2">
            {platforms.map((platform) => (
              <motion.div
                key={platform.name}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 transition-all cursor-pointer border border-slate-100 hover:border-slate-200 shadow-sm"
              >
                <div className="relative">
                  <Circle 
                    className="w-8 h-8" 
                    style={{ color: platform.color }}
                    fill={platform.color}
                    fillOpacity={0.15}
                  />
                  <div 
                    className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                      platform.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                </div>
                <span className="text-sm text-slate-700 font-medium">{platform.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 lg:ml-0 ml-0 shadow-sm">
          {/* Global Search */}
          <div className="flex-1 max-w-2xl lg:ml-0 ml-16">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
              <input
                type="text"
                placeholder="Search across all your knowledge..."
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 placeholder-slate-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Quick Stats & Profile */}
          <div className="flex items-center gap-3 md:gap-6 ml-4 md:ml-8">
            {/* Stats - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-center">
                <div className="text-xs text-slate-500 font-medium">Platforms</div>
                <div className="text-lg font-bold text-indigo-600">4</div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-center">
                <div className="text-xs text-slate-500 font-medium">Hours Today</div>
                <div className="text-lg font-bold text-cyan-600">2.5h</div>
              </div>
            </div>

            {/* Profile with Streak and Logout */}
            <div className="relative">
              <motion.div 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-100"
              >
                <div className="text-right hidden md:block">
                  <div className="text-sm font-semibold text-slate-900">Tara</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    12 day streak
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-md">
                  T
                </div>
              </motion.div>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border-2 border-slate-200 overflow-hidden z-50"
                  >
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all"
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