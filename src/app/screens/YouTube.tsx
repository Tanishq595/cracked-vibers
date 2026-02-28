import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'motion/react';
import {
  Youtube,
  Loader2,
  ExternalLink,
  FolderOpen,
  AlertCircle,
  Link2,
  Search as SearchIcon,
  History,
  Trash2,
} from 'lucide-react';
import { AIChatAssistant } from '../components/AIChatAssistant';

type YouTubeSearchResult = {
  title: string;
  url: string;
  description?: string;
  thumbnailUrl?: string;
  videoId?: string;
};

type YouTubeData = {
  connected: boolean;
  channelTitle?: string;
  channelId?: string;
  playlists?: Array<{
    id: string;
    title: string;
    videoCount: number;
    thumbnailUrl: string;
  }>;
  error?: string;
};

type WatchHistoryItem = {
  id: string;
  video_id: string;
  video_url: string | null;
  title: string | null;
  watched_at: string;
};

export function YouTube() {
  const { getToken } = useAuth();
  const [data, setData] = useState<YouTubeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [watchHistoryLoading, setWatchHistoryLoading] = useState(false);
  const [clearHistoryLoading, setClearHistoryLoading] = useState(false);

  const loadWatchHistory = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setWatchHistoryLoading(true);
    try {
      const res = await fetch('/api/youtube-watch-history', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      setWatchHistory(Array.isArray(body?.history) ? body.history : []);
    } finally {
      setWatchHistoryLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    getToken()
      .then((token) => {
        if (!token) {
          if (!cancelled) setData({ connected: false });
          return;
        }
        return fetch('/api/youtube-data', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => {
        if (!res || !res.ok) return;
        return res.json();
      })
      .then((body) => {
        if (cancelled) return;
        setData(
          body ?? {
            connected: false,
          }
        );
      })
      .catch(() => {
        if (!cancelled) setData({ connected: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  useEffect(() => {
    loadWatchHistory();
  }, [loadWatchHistory]);

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || data?.connected !== true) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const token = await getToken();
      const res = await fetch('/api/search-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ query: q }),
      });
      const body = await res.json();
      const list = Array.isArray(body?.results)
        ? body.results.map((r: { title?: string; url?: string; description?: string; thumbnailUrl?: string; videoId?: string }) => ({
            title: r.title ?? '',
            url: r.url ?? '',
            description: r.description,
            thumbnailUrl: r.thumbnailUrl,
            videoId: r.videoId,
          }))
        : [];
      setSearchResults(list);
      setPlayingVideoId(null);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, data?.connected, getToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#ffb347] animate-spin" />
        <p className="text-slate-600 font-medium">Loading YouTube...</p>
      </div>
    );
  }

  const connected = data?.connected === true;
  const channelTitle = data?.channelTitle ?? '';
  const channelId = data?.channelId ?? '';
  const playlists = Array.isArray(data?.playlists) ? data.playlists : [];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      <AIChatAssistant />

      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-red-100 border border-red-200">
          <Youtube className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">YouTube</h1>
          <p className="text-slate-600 text-sm">
            {connected
              ? `Connected${channelTitle ? ` as ${channelTitle}` : ''}`
              : 'Connect your account to see playlists and history'}
          </p>
        </div>
      </div>

      {!connected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 flex flex-col items-center text-center gap-4"
        >
          <div className="p-4 rounded-full bg-slate-200">
            <Link2 className="w-10 h-10 text-slate-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Not connected</h2>
            <p className="text-slate-600 text-sm max-w-sm">
              Connect your YouTube account in Onboarding to see your playlists here.
            </p>
          </div>
          <a
            href="/onboarding"
            className="px-5 py-2.5 rounded-xl font-semibold bg-[#ffb347] text-white hover:bg-[#ff8c42] transition-colors"
          >
            Go to Onboarding
          </a>
        </motion.div>
      )}

      {connected && data?.error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">{data.error}</p>
        </div>
      )}

      {/* Embedded player (iframe) when a video is selected */}
      {connected && playingVideoId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-slate-200 bg-slate-900 overflow-hidden shadow-xl"
        >
          <div className="aspect-video w-full">
            <iframe
              title="YouTube player"
              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
          <div className="p-3 flex items-center justify-between bg-slate-800">
            <p className="text-sm text-slate-300">Playing in app</p>
            <a
              href={`https://www.youtube.com/watch?v=${playingVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-red-400 hover:text-red-300 font-medium flex items-center gap-1"
            >
              Open on YouTube <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      )}

      {/* Watch history - always visible so user knows where it is */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-900">Recently watched</h2>
            </div>
            {watchHistory.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  const token = await getToken();
                  if (!token) return;
                  setClearHistoryLoading(true);
                  try {
                    const res = await fetch('/api/youtube-watch-history', {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      setWatchHistory([]);
                    }
                  } finally {
                    setClearHistoryLoading(false);
                  }
                }}
                disabled={clearHistoryLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearHistoryLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Clear history
              </button>
            )}
          </div>
          {watchHistoryLoading ? (
            <p className="text-sm text-slate-500 flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </p>
          ) : watchHistory.length === 0 ? (
            <div className="py-6 text-center rounded-xl bg-slate-50 border border-slate-100">
              <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">No videos watched yet</p>
              <p className="text-slate-500 text-sm mt-1">Search above and play a video in the player to see it here.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {watchHistory.map((item) => (
                <motion.div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPlayingVideoId(item.video_id)}
                  onKeyDown={(e) => e.key === 'Enter' && setPlayingVideoId(item.video_id)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 p-3 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <img
                    src={`https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`}
                    alt=""
                    className="w-24 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 line-clamp-2 text-sm">{item.title || 'Video'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(item.watched_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <a
                    href={item.video_url || `https://www.youtube.com/watch?v=${item.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-red-600 shrink-0 mt-1 p-1"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Search YouTube - when connected */}
      {connected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm"
        >
          <label className="block text-sm font-semibold text-slate-700 mb-2">Search YouTube</label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for videos..."
                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="px-5 py-3 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
              Search
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-slate-600">{searchResults.length} results — click a video to play above</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {searchResults.map((video, idx) => {
                  let id: string | null = video.videoId ?? null;
                  if (!id && video.url) {
                    try {
                      id = new URL(video.url).searchParams.get('v');
                    } catch {
                      id = null;
                    }
                  }
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!id) return;
                        setPlayingVideoId(id);
                        getToken().then((token) => {
                          if (!token) return;
                          fetch('/api/youtube-watch-history', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ video_id: id, video_url: video.url, title: video.title }),
                          }).then(() => loadWatchHistory()).catch(() => {});
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' || !id) return;
                        setPlayingVideoId(id);
                        getToken().then((token) => {
                          if (!token) return;
                          fetch('/api/youtube-watch-history', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ video_id: id, video_url: video.url, title: video.title }),
                          }).then(() => loadWatchHistory()).catch(() => {});
                        });
                      }}
                      className="flex gap-3 p-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    >
                      {video.thumbnailUrl && (
                        <img src={video.thumbnailUrl} alt="" className="w-28 h-20 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 line-clamp-2">{video.title}</p>
                        {video.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{video.description}</p>
                        )}
                      </div>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-red-600 hover:text-red-700 shrink-0 mt-1 p-1"
                        title="Open on YouTube"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
          {searchLoading && searchResults.length === 0 && (
            <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </p>
          )}
        </motion.div>
      )}

      {connected && playlists.length === 0 && !data?.error && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <FolderOpen className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">No playlists yet</p>
          <p className="text-slate-500 text-sm mt-1">Create playlists on YouTube to see them here.</p>
        </div>
      )}

      {connected && playlists.length > 0 && (
        <div>
          {channelId && (
            <a
              href={`https://www.youtube.com/channel/${channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium mb-4"
            >
              View channel on YouTube <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((pl) => (
              <motion.a
                key={pl.id}
                href={`https://www.youtube.com/playlist?list=${pl.id}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-slate-200 bg-card overflow-hidden hover:border-[#ffb347] hover:shadow-lg transition-all flex flex-col"
              >
                <div className="aspect-video bg-slate-200 relative">
                  {pl.thumbnailUrl ? (
                    <img
                      src={pl.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="font-semibold text-slate-900 line-clamp-2">{pl.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {pl.videoCount} video{pl.videoCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-2 border-t border-slate-100 flex items-center justify-end gap-1 text-xs text-red-600 font-medium">
                  Open on YouTube <ExternalLink className="w-3 h-3" />
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
