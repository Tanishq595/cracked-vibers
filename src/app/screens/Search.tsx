import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search as SearchIcon, 
  Sparkles, 
  Youtube, 
  FileText, 
  GraduationCap,
  Clock,
  ExternalLink,
  TrendingUp
} from 'lucide-react';

const suggestions = [
  'cellular respiration',
  'French Revolution 1789',
  'linear algebra matrices',
  'quantum mechanics basics',
  'Renaissance art movement',
];

const searchResults = [
  {
    category: 'AI-Synthesized',
    icon: Sparkles,
    color: '#6366F1',
    items: [
      {
        title: 'Cellular Respiration: Complete Overview',
        description: 'AI-generated summary from 3 sources: Combines your Notion notes on glycolysis, YouTube lecture on Krebs cycle, and Classroom assignment on electron transport chain.',
        confidence: '95%',
        lastUpdated: 'Synthesized 2 min ago',
      },
    ],
  },
  {
    category: 'YouTube',
    icon: Youtube,
    color: '#FF0000',
    items: [
      {
        title: 'Cellular Respiration and the Mighty Mitochondria - CrashCourse',
        description: 'Learn about cellular respiration, the process by which organisms break down glucose into a form that the cell can use...',
        duration: '12:45',
        views: '2.1M views',
        link: 'youtube.com',
      },
      {
        title: 'Cellular Respiration (UPDATED) - Amoeba Sisters',
        description: 'Updated cellular respiration video - Glycolysis, Krebs Cycle, Electron Transport Chain...',
        duration: '8:32',
        views: '856K views',
        link: 'youtube.com',
      },
    ],
  },
  {
    category: 'Notion',
    icon: FileText,
    color: '#ffffff',
    items: [
      {
        title: 'Biology 201: Cellular Processes',
        description: 'Your notes from Feb 15, 2026. Covers glycolysis pathway, ATP production, and mitochondrial structure...',
        lastEdited: '3 days ago',
        tags: ['Biology', 'Midterm'],
      },
      {
        title: 'Cell Biology Study Guide',
        description: 'Comprehensive guide including cellular respiration, photosynthesis comparison, and practice questions...',
        lastEdited: '1 week ago',
        tags: ['Study Guide'],
      },
    ],
  },
  {
    category: 'Google Classroom',
    icon: GraduationCap,
    color: '#34A853',
    items: [
      {
        title: 'Assignment: Cellular Respiration Lab Report',
        description: 'Due March 5, 2026. Analyze the efficiency of cellular respiration under different conditions...',
        dueDate: '5 days left',
        status: 'In Progress',
      },
    ],
  },
];

export function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(query.length > 0);
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Search Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-12"
      >
        <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Universal Search
        </h1>
        <p className="text-slate-600 text-base md:text-lg font-medium">
          Search across YouTube, Notion, Classroom, Canvas, and more
        </p>
      </motion.div>

      {/* Massive Search Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 md:mb-8"
      >
        <div className="relative group">
          <SearchIcon className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-5 md:w-6 h-5 md:h-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <Sparkles className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-5 md:w-6 h-5 md:h-6 text-indigo-400 opacity-60 group-focus-within:opacity-100 transition-opacity hidden md:block" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="What do you want to learn about?"
            className="w-full pl-12 md:pl-16 pr-12 md:pr-16 py-5 md:py-6 text-lg md:text-xl bg-white hover:bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-2xl text-slate-900 placeholder-slate-400 outline-none transition-all shadow-sm focus:shadow-lg"
          />
        </div>

        {/* Search Suggestions */}
        {!showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 mt-4 justify-center"
          >
            <span className="text-sm text-slate-500 font-semibold">Try:</span>
            {suggestions.map((suggestion) => (
              <motion.button
                key={suggestion}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSearch(suggestion)}
                className="px-4 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-sm text-slate-700 hover:text-indigo-700 transition-all font-medium shadow-sm"
              >
                {suggestion}
              </motion.button>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Search Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <p className="text-slate-600 font-medium">
                Found <span className="text-slate-900 font-bold">12 results</span> for "{searchQuery}"
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <Clock className="w-4 h-4" />
                <span>Results in 0.43s</span>
              </div>
            </div>

            {/* Results by Category */}
            {searchResults.map((category, catIndex) => {
              const Icon = category.icon;
              return (
                <motion.div
                  key={category.category}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIndex * 0.1 }}
                  className="space-y-4"
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: `${category.color === '#ffffff' ? '#6366F1' : category.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: category.color === '#ffffff' ? '#6366F1' : category.color }} />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">{category.category}</h2>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Category Items */}
                  <div className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <motion.div
                        key={itemIndex}
                        whileHover={{ x: 4, scale: 1.005 }}
                        whileTap={{ scale: 0.98 }}
                        className="group p-6 rounded-2xl bg-white hover:bg-indigo-50/30 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 transition-colors flex-1">
                            {item.title}
                          </h3>
                          <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors ml-4" />
                        </div>
                        
                        <p className="text-slate-600 text-sm mb-4 font-medium">
                          {item.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                          {'confidence' in item && (
                            <span className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                              <TrendingUp className="w-3 h-3" />
                              {item.confidence} confidence
                            </span>
                          )}
                          {'duration' in item && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Clock className="w-3 h-3" />
                              {item.duration}
                            </span>
                          )}
                          {'views' in item && <span className="text-slate-600">{item.views}</span>}
                          {'lastEdited' in item && <span className="text-slate-600">Edited {item.lastEdited}</span>}
                          {'lastUpdated' in item && <span className="text-slate-600">{item.lastUpdated}</span>}
                          {'dueDate' in item && (
                            <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg">
                              {item.dueDate}
                            </span>
                          )}
                          {'tags' in item && item.tags.map((tag) => (
                            <span key={tag} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg">
                              {tag}
                            </span>
                          ))}
                          {'status' in item && (
                            <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg">
                              {item.status}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!showResults && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 flex items-center justify-center shadow-sm">
            <SearchIcon className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-slate-900">Start searching</h3>
          <p className="text-slate-500 font-medium">
            Type anything to search across all your connected platforms
          </p>
        </motion.div>
      )}
    </div>
  );
}