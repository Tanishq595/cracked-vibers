import { motion } from 'motion/react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Youtube, 
  FileText, 
  GraduationCap,
  Sparkles,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { AIChatAssistant } from '../components/AIChatAssistant';

interface GapData {
  topic: string;
  youtube: number;
  notion: number;
  classroom: number;
  canvas: number;
  overall: number;
}

const gapData: GapData[] = [
  { topic: 'Cellular Respiration', youtube: 100, notion: 90, classroom: 80, canvas: 0, overall: 85 },
  { topic: 'French Revolution', youtube: 60, notion: 100, classroom: 70, canvas: 50, overall: 70 },
  { topic: 'Linear Algebra', youtube: 40, notion: 80, classroom: 90, canvas: 60, overall: 68 },
  { topic: 'Quantum Mechanics', youtube: 70, notion: 50, classroom: 60, canvas: 40, overall: 55 },
  { topic: 'Renaissance Art', youtube: 30, notion: 70, classroom: 80, canvas: 70, overall: 63 },
  { topic: 'World War II', youtube: 85, notion: 60, classroom: 50, canvas: 30, overall: 56 },
  { topic: 'Organic Chemistry', youtube: 50, notion: 70, classroom: 85, canvas: 60, overall: 66 },
  { topic: 'Data Structures', youtube: 90, notion: 40, classroom: 70, canvas: 0, overall: 50 },
];

const insights = [
  {
    topic: 'World War II',
    issue: 'You know WWII causes but not consequences',
    suggestion: 'Watch this 8-min YouTube clip',
    link: 'The Aftermath of WWII - History Matters',
    priority: 'high',
    timeToClose: '8 min',
  },
  {
    topic: 'Linear Algebra',
    issue: 'Missing practical applications',
    suggestion: 'Review Canvas assignment examples',
    link: 'Matrix Applications in Computer Graphics',
    priority: 'medium',
    timeToClose: '15 min',
  },
  {
    topic: 'Data Structures',
    issue: 'Theory strong, implementation weak',
    suggestion: 'Complete these Notion coding exercises',
    link: 'Binary Trees Implementation Guide',
    priority: 'high',
    timeToClose: '20 min',
  },
  {
    topic: 'Quantum Mechanics',
    issue: 'Conceptual understanding needs reinforcement',
    suggestion: 'Read this Notion summary page',
    link: 'Quantum Mechanics: Wave-Particle Duality',
    priority: 'low',
    timeToClose: '12 min',
  },
];

const getCoverageColor = (value: number) => {
  if (value === 0) return 'bg-slate-100 border-slate-300';
  if (value < 50) return 'bg-red-500/20 border-red-500/40';
  if (value < 70) return 'bg-amber-500/20 border-amber-500/40';
  if (value < 85) return 'bg-[#ffb347]/20 border-[#ffb347]/40';
  return 'bg-cyan-500/20 border-cyan-500/40';
};

const getCoverageIntensity = (value: number) => {
  if (value === 0) return '0';
  return (value / 100).toFixed(2);
};

export function GapAnalysis() {
  return (
    <>
      <AIChatAssistant />
      <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold mb-2 text-slate-900">Gap Analysis</h1>
          <p className="text-slate-600 font-medium">
            Identify and close knowledge gaps across all platforms
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#ffb347]/10 to-[#ff8c42]/10 border-2 border-[#ffb347]/40 rounded-xl shadow-sm">
          <TrendingDown className="w-5 h-5 text-[#ff8c42]" />
          <div>
            <div className="text-2xl font-bold text-slate-900">4</div>
            <div className="text-xs text-slate-600 font-semibold">Active Gaps</div>
          </div>
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#ffb347]" />
          <h2 className="text-xl font-bold text-slate-900">AI-Powered Insights</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              whileHover={{ x: 4, scale: 1.01 }}
              className={`group p-6 rounded-2xl bg-white border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${
                insight.priority === 'high'
                  ? 'border-red-300 hover:border-red-400 hover:bg-red-50/50'
                  : insight.priority === 'medium'
                  ? 'border-amber-300 hover:border-amber-400 hover:bg-amber-50/50'
                  : 'border-[#ffb347]/50 hover:border-[#ffb347] hover:bg-[#ffb347]/5'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-slate-900">{insight.topic}</h3>
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${
                      insight.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : insight.priority === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-[#ffb347]/20 text-[#ff8c42]'
                    }`}>
                      {insight.priority}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 font-medium">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {insight.issue}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-[#ff8c42] mb-2 font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>{insight.suggestion}</span>
                  </div>
                  <p className="text-xs text-slate-500 italic font-medium">"{insight.link}"</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t-2 border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                  <Clock className="w-3 h-3" />
                  <span>{insight.timeToClose} to close</span>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#ffb347] hover:bg-[#ff8c42] rounded-lg text-sm font-semibold text-white transition-all group-hover:shadow-lg group-hover:shadow-[#ffb347]/30">
                  Close Gap
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Coverage Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white border-2 border-slate-200 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Knowledge Coverage Heatmap</h2>
          <div className="flex items-center gap-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
              <span>No data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" />
              <span>Low (&lt;50%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
              <span>Medium (50-69%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-[#ffb347]/20 border border-[#ffb347]/40" />
              <span>Good (70-84%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyan-500/20 border border-cyan-500/40" />
              <span>Excellent (85%+)</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-4 px-4 text-sm font-bold text-slate-700">Topic</th>
                <th className="text-center py-4 px-4">
                  <div className="flex flex-col items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-500" />
                    <span className="text-xs text-slate-600 font-semibold">YouTube</span>
                  </div>
                </th>
                <th className="text-center py-4 px-4">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-5 h-5 text-slate-900" />
                    <span className="text-xs text-slate-600 font-semibold">Notion</span>
                  </div>
                </th>
                <th className="text-center py-4 px-4">
                  <div className="flex flex-col items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs text-slate-600 font-semibold">Classroom</span>
                  </div>
                </th>
                <th className="text-center py-4 px-4">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    <span className="text-xs text-slate-600 font-semibold">Canvas</span>
                  </div>
                </th>
                <th className="text-center py-4 px-4">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#ffb347]" />
                    <span className="text-xs text-slate-600 font-semibold">Overall</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {gapData.map((row, index) => (
                <motion.tr
                  key={row.topic}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="font-semibold text-slate-900">{row.topic}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${getCoverageColor(row.youtube)}`}
                        style={{ 
                          backgroundColor: row.youtube > 0 ? `rgba(255, 0, 0, ${getCoverageIntensity(row.youtube)})` : undefined 
                        }}
                      >
                        <span className="text-xs font-bold text-slate-900">{row.youtube > 0 ? `${row.youtube}%` : '—'}</span>
                      </motion.div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${getCoverageColor(row.notion)}`}
                        style={{ 
                          backgroundColor: row.notion > 0 ? `rgba(100, 100, 100, ${getCoverageIntensity(row.notion)})` : undefined 
                        }}
                      >
                        <span className="text-xs font-bold text-slate-900">{row.notion > 0 ? `${row.notion}%` : '—'}</span>
                      </motion.div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${getCoverageColor(row.classroom)}`}
                        style={{ 
                          backgroundColor: row.classroom > 0 ? `rgba(52, 168, 83, ${getCoverageIntensity(row.classroom)})` : undefined 
                        }}
                      >
                        <span className="text-xs font-bold text-slate-900">{row.classroom > 0 ? `${row.classroom}%` : '—'}</span>
                      </motion.div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${getCoverageColor(row.canvas)}`}
                        style={{ 
                          backgroundColor: row.canvas > 0 ? `rgba(225, 63, 47, ${getCoverageIntensity(row.canvas)})` : undefined 
                        }}
                      >
                        <span className="text-xs font-bold text-slate-900">{row.canvas > 0 ? `${row.canvas}%` : '—'}</span>
                      </motion.div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`w-16 h-12 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${getCoverageColor(row.overall)}`}
                      >
                        <span className="text-sm font-bold text-slate-900">{row.overall}%</span>
                      </motion.div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-xl border-2 border-cyan-200 text-center shadow-sm"
        >
          <div className="text-3xl font-bold text-cyan-700 mb-2">87%</div>
          <div className="text-sm text-slate-700 font-semibold">Avg Coverage</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="p-6 bg-gradient-to-br from-[#ffb347]/10 to-[#ff8c42]/20 rounded-xl border-2 border-[#ffb347]/30 text-center shadow-sm"
        >
          <div className="text-3xl font-bold text-[#ff8c42] mb-2">3</div>
          <div className="text-sm text-slate-700 font-semibold">Gaps Closed This Week</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border-2 border-amber-200 text-center shadow-sm"
        >
          <div className="text-3xl font-bold text-amber-700 mb-2">55m</div>
          <div className="text-sm text-slate-700 font-semibold">Est. Time to Clear</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border-2 border-emerald-200 text-center shadow-sm"
        >
          <div className="text-3xl font-bold text-emerald-700 mb-2">8</div>
          <div className="text-sm text-slate-700 font-semibold">Topics Mastered</div>
        </motion.div>
      </div>
      </div>
    </>
  );
}