import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Sparkles,
  GripVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface StudyBlock {
  id: number;
  title: string;
  subject: string;
  time: string;
  duration: string;
  priority: 'high' | 'medium' | 'low';
  type: 'study' | 'review' | 'assignment' | 'ai-suggested';
  day: number;
}

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'];

const studyBlocks: StudyBlock[] = [
  { id: 1, title: 'Linear Algebra Review', subject: 'Math', time: '9:00', duration: '1h', priority: 'high', type: 'study', day: 0 },
  { id: 2, title: 'Cellular Respiration Lab', subject: 'Biology', time: '14:00', duration: '2h', priority: 'high', type: 'assignment', day: 0 },
  { id: 3, title: 'French Vocabulary', subject: 'Language', time: '19:00', duration: '30m', priority: 'low', type: 'review', day: 0 },
  { id: 4, title: 'Physics Problem Set', subject: 'Science', time: '10:00', duration: '1.5h', priority: 'medium', type: 'assignment', day: 1 },
  { id: 5, title: 'Close Gap: WWII Consequences', subject: 'History', time: '15:00', duration: '30m', priority: 'high', type: 'ai-suggested', day: 1 },
  { id: 6, title: 'Data Structures Practice', subject: 'CS', time: '9:00', duration: '2h', priority: 'high', type: 'study', day: 2 },
  { id: 7, title: 'Renaissance Art Essay', subject: 'Humanities', time: '13:00', duration: '1h', priority: 'medium', type: 'assignment', day: 2 },
  { id: 8, title: 'Chemistry Quiz Prep', subject: 'Science', time: '11:00', duration: '1h', priority: 'high', type: 'review', day: 3 },
  { id: 9, title: 'Calculus Integration', subject: 'Math', time: '16:00', duration: '1.5h', priority: 'medium', type: 'study', day: 3 },
  { id: 10, title: 'Close Gap: Quantum Mechanics', subject: 'Physics', time: '10:00', duration: '45m', priority: 'medium', type: 'ai-suggested', day: 4 },
  { id: 11, title: 'Biology Review Session', subject: 'Biology', time: '14:00', duration: '1h', priority: 'low', type: 'review', day: 4 },
];

const aiSuggestions = [
  { time: 'Tomorrow 10:00 AM', task: 'Review Linear Algebra prerequisites', reason: 'Optimal based on your peak focus time' },
  { time: 'Wednesday 3:00 PM', task: 'Close Data Structures gap', reason: 'High priority, low cognitive load after lunch' },
  { time: 'Friday 9:00 AM', task: 'Quantum Mechanics deep dive', reason: 'Fresh mind for complex topics' },
];

const getTypeColor = (type: string) => {
  switch (type) {
    case 'ai-suggested':
      return 'bg-gradient-to-r from-[#ffb347] to-[#ff8c42] border-[#ffb347]';
    case 'assignment':
      return 'bg-red-500 border-red-400';
    case 'study':
      return 'bg-[#ffb347] border-[#ff8c42]';
    case 'review':
      return 'bg-cyan-500 border-cyan-400';
    default:
      return 'bg-slate-400 border-slate-300';
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'medium':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'low':
      return 'bg-[#ffb347]/20 text-[#ff8c42] border-[#ffb347]/40';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
};

export function Planner() {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [draggedBlock, setDraggedBlock] = useState<number | null>(null);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900">Smart Study Planner</h1>
          <p className="text-slate-600 font-medium">
            AI-optimized schedule based on your gaps and learning patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#ffb347] to-[#ff8c42] hover:from-[#ff8c42] hover:to-[#ff6b35] rounded-xl font-semibold text-white transition-all shadow-lg shadow-[#ffb347]/30"
          >
            <Plus className="w-5 h-5" />
            Add Study Block
          </motion.button>
        </div>
      </motion.div>

      {/* Week Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm"
      >
        <button
          onClick={() => setCurrentWeek(currentWeek - 1)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-[#ffb347]" />
          <span className="text-lg font-semibold text-slate-900">
            Week of Feb 24 - Mar 2, 2026
          </span>
        </div>
        <button
          onClick={() => setCurrentWeek(currentWeek + 1)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar - Spans 3 columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 rounded-2xl bg-white border-2 border-slate-200 p-6 overflow-x-auto shadow-sm"
        >
          {/* Calendar Grid */}
          <div className="min-w-[900px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 gap-2 mb-4">
              <div className="text-xs text-slate-500 text-center font-semibold">Time</div>
              {weekDays.map((day, index) => (
                <div key={day} className="text-center">
                  <div className="text-sm font-bold text-slate-900">{day}</div>
                  <div className="text-xs text-slate-500 font-medium">Feb {24 + index}</div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="relative">
              {hours.map((hour, hourIndex) => (
                <div key={hour} className="grid grid-cols-8 gap-2 mb-2">
                  {/* Time Label */}
                  <div className="text-xs text-slate-500 text-right pr-2 py-1 font-medium">
                    {hour}
                  </div>

                  {/* Day Columns */}
                  {weekDays.map((day, dayIndex) => {
                    const blocksForSlot = studyBlocks.filter(
                      (block) => block.day === dayIndex && parseInt(block.time) === hourIndex + 8
                    );

                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="min-h-[60px] bg-slate-50 rounded-lg border border-slate-200 hover:border-[#ffb347]/50 transition-colors relative"
                      >
                        {blocksForSlot.map((block) => (
                          <motion.div
                            key={block.id}
                            drag
                            dragMomentum={false}
                            whileHover={{ scale: 1.02 }}
                            className={`absolute inset-0 p-2 rounded-lg border-2 ${getTypeColor(block.type)} cursor-move group overflow-hidden shadow-md`}
                            onDragStart={() => setDraggedBlock(block.id)}
                            onDragEnd={() => setDraggedBlock(null)}
                          >
                            {/* Drag Handle */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="w-4 h-4 text-white/70" />
                            </div>

                            {/* Block Content */}
                            <div className="relative">
                              <div className="text-xs font-bold text-white mb-1 pr-6">
                                {block.title}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-white/90">
                                <Clock className="w-3 h-3" />
                                <span>{block.duration}</span>
                              </div>
                              {block.type === 'ai-suggested' && (
                                <div className="absolute -top-1 -left-1">
                                  <Sparkles className="w-4 h-4 text-white animate-pulse drop-shadow-lg" />
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-6 border-t-2 border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#ffb347] border-2 border-[#ff8c42] shadow-sm" />
              <span className="text-xs text-slate-600 font-semibold">Study</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-500 border-2 border-cyan-400 shadow-sm" />
              <span className="text-xs text-slate-600 font-semibold">Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500 border-2 border-red-400 shadow-sm" />
              <span className="text-xs text-slate-600 font-semibold">Assignment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-[#ffb347] to-[#ff8c42] border-2 border-[#ffb347] shadow-sm" />
              <span className="text-xs text-slate-600 font-semibold">AI-Suggested</span>
            </div>
          </div>
        </motion.div>

        {/* Sidebar - AI Suggestions & Stats */}
        <div className="space-y-6">
          {/* AI Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white border-2 border-slate-200 p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#ffb347]" />
              <h3 className="font-bold text-slate-900">AI Suggestions</h3>
            </div>

            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  whileHover={{ x: 4 }}
                  className="p-3 bg-gradient-to-r from-[#ffb347]/10 to-[#ff8c42]/10 border-2 border-[#ffb347]/30 rounded-xl cursor-pointer hover:border-[#ffb347] hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs text-[#ff8c42] font-bold">{suggestion.time}</div>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-[#ffb347] transition-colors" />
                  </div>
                  <div className="text-sm text-slate-900 font-semibold mb-2">{suggestion.task}</div>
                  <div className="text-xs text-slate-600 italic font-medium">{suggestion.reason}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* This Week Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-white border-2 border-slate-200 p-6 shadow-sm"
          >
            <h3 className="font-bold text-slate-900 mb-4">This Week</h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600 font-semibold">Study Hours</span>
                  <span className="text-slate-900 font-bold">12.5h / 15h</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className="h-full bg-gradient-to-r from-[#ffb347] to-[#ff8c42] rounded-full" style={{ width: '83%' }} />
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Tasks Completed</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    8/11
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Gaps Closed</span>
                  <span className="text-cyan-600 font-bold">3</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Overdue</span>
                  <span className="text-orange-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    1
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Upcoming */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl bg-white border-2 border-slate-200 p-6 shadow-sm"
          >
            <h3 className="font-bold text-slate-900 mb-4">Up Next</h3>

            <div className="space-y-3">
              {studyBlocks.slice(0, 3).map((block) => (
                <div
                  key={block.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#ffb347]/50 hover:bg-[#ffb347]/5 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-900">{block.title}</div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg border-2 font-semibold ${getPriorityBadge(block.priority)}`}>
                      {block.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{weekDays[block.day]}, {block.time}</span>
                    <span>•</span>
                    <span>{block.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}