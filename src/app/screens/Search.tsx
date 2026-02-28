import { useState, useCallback, useRef, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search as SearchIcon,
  Sparkles,
  Globe,
  Clock,
  ExternalLink,
  Loader2,
  FileText,
} from 'lucide-react';
import { AIChatAssistant } from '../components/AIChatAssistant';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { cn } from '../components/ui/utils';

const suggestions = [
  'cellular respiration',
  'French Revolution 1789',
  'linear algebra matrices',
  'quantum mechanics basics',
  'Renaissance art movement',
];

type SearchResultItem = { title: string; url?: string; description?: string; key?: string };

export function Search() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchInLibrary, setSearchInLibrary] = useState(false);
  const [lastSearchWasLibrary, setLastSearchWasLibrary] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setShowResults(false);
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    setSearchQuery(q);
    setShowResults(true);
    setSearchLoading(true);
    setSearchError(null);
    setSearchTimeMs(null);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const start = performance.now();
    const inLibrary = searchInLibrary;
    try {
      if (inLibrary) {
        if (!user?.id) {
          setSearchError('Sign in to search your library.');
          setSearchResults([]);
          setSearchLoading(false);
          setHasSearched(true);
          abortRef.current = null;
          return;
        }
        const res = await fetch('/api/search-library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, userId: user.id }),
          signal: abortRef.current.signal,
        });
        const data = await res.json();
        const elapsed = Math.round(performance.now() - start);
        setSearchTimeMs(elapsed);
        if (!res.ok) {
          setSearchError(data.error ?? 'Search failed');
          setSearchResults([]);
          return;
        }
        const list = Array.isArray(data.results) ? data.results : [];
        setLastSearchWasLibrary(true);
        setSearchResults(
          list.map((r: { key: string; title: string; snippet: string }) => ({
            title: r.title,
            description: r.snippet,
            key: r.key,
            url: '/dashboard/library',
          }))
        );
      } else {
        setLastSearchWasLibrary(false);
        const res = await fetch('/api/search-exa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
          signal: abortRef.current.signal,
        });
        const data = await res.json();
        const elapsed = Math.round(performance.now() - start);
        setSearchTimeMs(elapsed);
        if (!res.ok) {
          setSearchError(data.error ?? 'Search failed');
          setSearchResults([]);
          return;
        }
        setSearchResults(Array.isArray(data.results) ? data.results : []);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setSearchError(e instanceof Error ? e.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
      setHasSearched(true);
      abortRef.current = null;
    }
  }, [searchInLibrary, user?.id]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) setShowResults(true);
    else setShowResults(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(searchQuery);
  };

  return (
    <>
      <AIChatAssistant />
      <div className="max-w-[1200px] mx-auto">
      {/* Search Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-12"
      >
        <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#ffb347] via-[#ff8c42] to-[#ff6b35] bg-clip-text text-transparent">
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
        <form onSubmit={handleSubmit}>
          <div className="group w-full rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-900 shadow-sm transition-all focus-within:border-[#ffb347] focus-within:ring-4 focus-within:ring-[#ffb347]/20 focus-within:shadow-lg px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
            <SearchIcon className="w-5 md:w-6 h-5 md:h-6 text-slate-400 group-focus-within:text-[#ffb347] transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchInLibrary ? 'Search inside your library documents…' : 'What do you want to learn about?'}
              className="flex-1 min-w-0 bg-transparent text-lg md:text-xl placeholder-slate-400 outline-none border-none"
            />
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
              <span className={cn('text-lg md:text-xl font-semibold', !searchInLibrary && 'text-slate-900')}>
                Web
              </span>
              <Switch
                checked={searchInLibrary}
                onCheckedChange={setSearchInLibrary}
                aria-label="Search my library"
              />
              <Label htmlFor="search-mode" className="text-lg md:text-xl font-semibold cursor-pointer">
                <span className={cn(searchInLibrary && 'text-slate-900')}>My library</span>
              </Label>
            </div>
          </div>
        </form>

        {/* Search Suggestions */}
        {!showResults && (
          <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center gap-2 mt-4 justify-center"
        >
            <span className="text-sm text-slate-500 font-semibold">Try:</span>
            {suggestions.map((suggestion) => (
              <motion.button
                key={suggestion}
                type="button"
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => runSearch(suggestion)}
                className="px-4 py-2 bg-slate-50 hover:bg-[#ffb347]/10 border border-slate-200 hover:border-[#ffb347]/50 rounded-xl text-sm text-slate-700 hover:text-[#ff8c42] transition-all font-medium shadow-sm"
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-slate-600 font-medium">
                {searchLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching…
                  </span>
                ) : (
                  <>
                    Found <span className="text-slate-900 font-bold">{searchResults.length} results</span> for &quot;{searchQuery}&quot;
                  </>
                )}
              </p>
              {searchTimeMs != null && !searchLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <Clock className="w-4 h-4" />
                  <span>Results in {(searchTimeMs / 1000).toFixed(2)}s</span>
                </div>
              )}
            </div>

            {searchError && (
              <p className="text-red-600 text-sm font-medium py-2">{searchError}</p>
            )}

            {/* Web (Exa) results */}
            {!searchLoading && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-[#ffb347]/20">
                    {lastSearchWasLibrary ? (
                      <FileText className="w-5 h-5 text-[#ff8c42]" />
                    ) : (
                      <Globe className="w-5 h-5 text-[#ff8c42]" />
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lastSearchWasLibrary ? 'My library' : 'Web Results'}
                  </h2>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="space-y-3">
                  {searchResults.map((item, itemIndex) => {
                    const isLibrary = lastSearchWasLibrary && item.url === '/dashboard/library';
                    const Wrapper = isLibrary ? motion.a : motion.a;
                    return (
                      <Wrapper
                        key={itemIndex}
                        href={item.url ?? '#'}
                        {...(isLibrary ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                        whileHover={{ x: 4, scale: 1.005 }}
                        whileTap={{ scale: 0.98 }}
                        className="group block p-6 rounded-2xl bg-white hover:bg-[#ffb347]/10 border border-slate-200 hover:border-[#ffb347]/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#ff8c42] transition-colors flex-1">
                            {item.title}
                          </h3>
                          <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-[#ffb347] transition-colors ml-4 shrink-0" />
                        </div>
                        {item.description && (
                          <p className="text-slate-600 text-sm font-medium line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </Wrapper>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {hasSearched && !searchLoading && searchResults.length === 0 && !searchError && (
              <p className="text-slate-500 font-medium">No results. Try a different query.</p>
            )}
            {showResults && !hasSearched && !searchLoading && (
              <p className="text-slate-500 font-medium">
                Press Enter to search {searchInLibrary ? 'your library' : 'the web'}.
              </p>
            )}
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#ffb347]/20 to-[#ff8c42]/20 border-2 border-[#ffb347]/40 flex items-center justify-center shadow-sm">
            <SearchIcon className="w-10 h-10 text-[#ffb347]" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-slate-900">Start searching</h3>
          <p className="text-slate-500 font-medium">
            Type anything to search across all your connected platforms
          </p>
        </motion.div>
      )}
      </div>
    </>
  );
}