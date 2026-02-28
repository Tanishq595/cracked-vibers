import { motion } from 'motion/react';
import { 
  Target, 
  TrendingUp, 
  Flame, 
  Sparkles, 
  ChevronRight,
  Youtube,
  FileText,
  GraduationCap,
  Clock,
  CheckCircle2
} from 'lucide-react';

const kpiCards = [
  { 
    label: 'Knowledge Coverage', 
    value: '87%', 
    icon: Target,
    color: 'indigo',
    trend: '+5% this week'
  },
  { 
    label: 'Active Gaps', 
    value: '4', 
    icon: TrendingUp,
    color: 'cyan',
    trend: '3 closed this week'
  },
  { 
    label: 'Study Streak', 
    value: '12 days', 
    icon: Flame,
    color: 'orange',
    trend: 'Keep it up!'
  },
];

const todaysFocus = [
  {
    task: 'Review prerequisite: Mitochondrial structure before cellular respiration',
    difficulty: 'Easy',
    time: '8 min',
    source: 'YouTube'
  },
  {
    task: 'Complete gap: French Revolution consequences (1789-1799)',
    difficulty: 'Medium',
    time: '15 min',
    source: 'Notion'
  },
  {
    task: 'Strengthen connection: Calculus → Physics applications',
    difficulty: 'Hard',
    time: '25 min',
    source: 'Classroom'
  },
];

const recentActivity = [
  {
    type: 'notion',
    title: 'Updated "Quantum Mechanics Notes"',
    time: '2 hours ago',
    icon: FileText,
    color: '#ffffff'
  },
  {
    type: 'youtube',
    title: 'Watched "Cell Division Explained"',
    time: '4 hours ago',
    icon: Youtube,
    color: '#FF0000'
  },
  {
    type: 'classroom',
    title: 'Submitted "Renaissance Art Essay"',
    time: '1 day ago',
    icon: GraduationCap,
    color: '#34A853'
  },
  {
    type: 'notion',
    title: 'Created "Linear Algebra Cheat Sheet"',
    time: '2 days ago',
    icon: FileText,
    color: '#ffffff'
  },
];

// Simple graph data for mini preview
const graphNodes = [
  { id: 1, x: 100, y: 80, label: 'Calculus', size: 20 },
  { id: 2, x: 200, y: 60, label: 'Physics', size: 16 },
  { id: 3, x: 150, y: 140, label: 'Chemistry', size: 18 },
  { id: 4, x: 250, y: 120, label: 'Biology', size: 14 },
  { id: 5, x: 180, y: 100, label: 'Stats', size: 12 },
];

const graphEdges = [
  { from: 1, to: 2 },
  { from: 1, to: 5 },
  { from: 3, to: 4 },
  { from: 2, to: 4 },
];

export function Dashboard() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-8">
      {/* Hero Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 p-6 md:p-8 border border-indigo-100 shadow-sm"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="relative">
          <h1 className="text-2xl md:text-4xl font-bold mb-2 text-slate-900">
            Good morning, Tara 👋
          </h1>
          <p className="text-lg md:text-xl text-slate-600">
            You've closed <span className="text-indigo-600 font-bold">3 gaps</span> this week
          </p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          const colorClasses = {
            indigo: 'from-indigo-50 to-indigo-100/50 border-indigo-200 text-indigo-600',
            cyan: 'from-cyan-50 to-cyan-100/50 border-cyan-200 text-cyan-600',
            orange: 'from-orange-50 to-orange-100/50 border-orange-200 text-orange-600',
          };

          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[card.color as keyof typeof colorClasses]} border-2 p-6 cursor-pointer group shadow-sm hover:shadow-md transition-all`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full blur-2xl group-hover:blur-3xl transition-all" />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <Icon className={`w-10 h-10 ${colorClasses[card.color as keyof typeof colorClasses].split(' ')[2]}`} />
                  <div className="text-xs font-semibold text-slate-600">{card.trend}</div>
                </div>
                <div className={`text-4xl font-bold mb-1 ${colorClasses[card.color as keyof typeof colorClasses].split(' ')[2]}`}>
                  {card.value}
                </div>
                <div className="text-sm font-semibold text-slate-700">{card.label}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Focus - Spans 2 columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Today's Focus</h2>
                <p className="text-sm text-slate-500 font-medium">AI-generated micro-tasks</p>
              </div>
            </div>
            <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold">
              Refresh <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {todaysFocus.map((task, index) => (
              <motion.div
                key={index}
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className="mt-1">
                  <CheckCircle2 className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 font-medium mb-2">{task.task}</p>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className={`px-2.5 py-1 rounded-lg ${
                      task.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                      task.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {task.difficulty}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3 h-3" />
                      {task.time}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{task.source}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Mini Knowledge Graph Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-white border border-slate-200 p-6 hover:border-cyan-200 transition-all shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Knowledge Graph</h2>
            <button className="text-sm text-cyan-600 hover:text-cyan-700 font-semibold">
              View All
            </button>
          </div>

          <div className="relative h-[240px] bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl overflow-hidden border border-cyan-100">
            <svg className="w-full h-full">
              {/* Edges */}
              {graphEdges.map((edge, i) => {
                const from = graphNodes.find(n => n.id === edge.from);
                const to = graphNodes.find(n => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="rgba(6, 182, 212, 0.4)"
                    strokeWidth="2"
                  />
                );
              })}
              
              {/* Nodes */}
              {graphNodes.map((node) => (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.size}
                    fill="rgba(6, 182, 212, 0.2)"
                    stroke="rgba(6, 182, 212, 0.8)"
                    strokeWidth="2.5"
                    className="cursor-pointer hover:fill-cyan-300/40 transition-all"
                  />
                  <text
                    x={node.x}
                    y={node.y + node.size + 14}
                    textAnchor="middle"
                    className="text-[10px] fill-cyan-700 font-semibold"
                  >
                    {node.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm"
      >
        <h2 className="text-xl font-bold mb-6 text-slate-900">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <motion.div
                key={index}
                whileHover={{ x: 4, scale: 1.005 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer"
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${activity.color === '#ffffff' ? '#6366F1' : activity.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: activity.color === '#ffffff' ? '#6366F1' : activity.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 font-medium">{activity.title}</p>
                  <p className="text-xs text-slate-500 font-medium">{activity.time}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}