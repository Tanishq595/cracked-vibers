import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'motion/react';
import {
  FileText,
  Loader2,
  ExternalLink,
  Link2,
  Search as SearchIcon,
  Database,
  RefreshCw,
  File,
  Plus,
  Edit3,
  ListPlus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { AIChatAssistant } from '../components/AIChatAssistant';

type NotionItem = {
  id: string;
  objectType: 'page' | 'database';
  title: string;
  url?: string;
  last_edited_time?: string;
};

type NotionData = {
  connected: boolean;
  pages?: NotionItem[];
};

function formatEdited(lastEdited?: string): string {
  if (!lastEdited) return '';
  try {
    const d = new Date(lastEdited);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch {
    return '';
  }
}

export function Notion() {
  const { getToken } = useAuth();
  const [data, setData] = useState<NotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Query database
  const [queryDbId, setQueryDbId] = useState('');
  const [queryResult, setQueryResult] = useState<{
    database: { id: string; title: string; propertyNames: string[] };
    results: Array<{ id: string; url?: string; properties: Record<string, string | number | boolean | null> }>;
    next_cursor: string | null;
    has_more: boolean;
  } | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [querySectionOpen, setQuerySectionOpen] = useState(false);

  // Create page
  const [createParentType, setCreateParentType] = useState<'database' | 'page'>('page');
  const [createParentId, setCreateParentId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createSectionOpen, setCreateSectionOpen] = useState(false);

  // Update page
  const [updatePageId, setUpdatePageId] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSectionOpen, setUpdateSectionOpen] = useState(false);

  // Append blocks
  const [appendPageId, setAppendPageId] = useState('');
  const [appendText, setAppendText] = useState('');
  const [appendBlockType, setAppendBlockType] = useState<'paragraph' | 'heading_2' | 'bulleted_list_item'>('paragraph');
  const [appendLoading, setAppendLoading] = useState(false);
  const [appendError, setAppendError] = useState<string | null>(null);
  const [appendSectionOpen, setAppendSectionOpen] = useState(false);

  const fetchNotion = async () => {
    const token = await getToken();
    if (!token) {
      setData({ connected: false });
      return;
    }
    const res = await fetch('/api/notion-data', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    setData(body ?? { connected: false });
  };

  useEffect(() => {
    let cancelled = false;
    getToken()
      .then((token) => {
        if (!token) {
          if (!cancelled) setData({ connected: false });
          return;
        }
        return fetch('/api/notion-data', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => {
        if (!res || !res.ok) return { connected: false };
        return res.json();
      })
      .then((body) => {
        if (cancelled) return;
        setData(body ?? { connected: false });
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotion();
    setRefreshing(false);
  };

  const loadQueryDatabase = async (cursor?: string) => {
    if (!queryDbId) return;
    const token = await getToken();
    if (!token) return;
    setQueryLoading(true);
    setQueryError(null);
    try {
      const url = cursor
        ? `/api/notion-query-database?databaseId=${encodeURIComponent(queryDbId)}&page_size=50&start_cursor=${encodeURIComponent(cursor)}`
        : `/api/notion-query-database?databaseId=${encodeURIComponent(queryDbId)}&page_size=50`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) {
        setQueryError(body.error ?? 'Failed to query database');
        if (cursor) setQueryResult((prev) => prev ?? null);
        return;
      }
      if (cursor && queryResult) {
        setQueryResult((prev) =>
          prev
            ? {
                database: body.database ?? prev.database,
                results: [...prev.results, ...(body.results ?? [])],
                next_cursor: body.next_cursor ?? null,
                has_more: body.has_more ?? false,
              }
            : body
        );
      } else {
        setQueryResult(body);
      }
    } catch {
      setQueryError('Request failed');
    } finally {
      setQueryLoading(false);
    }
  };

  const handleCreatePage = async () => {
    const token = await getToken();
    if (!token) return;
    setCreateLoading(true);
    setCreateError(null);
    setCreatedUrl(null);
    try {
      const res = await fetch('/api/notion-create-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...(createParentType === 'database' ? { parentDatabaseId: createParentId } : { parentPageId: createParentId }),
          title: createTitle,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setCreateError(body.error ?? 'Failed to create page');
        return;
      }
      setCreatedUrl(body.url ?? null);
      setCreateTitle('');
      setCreateParentId('');
      if (data?.pages) fetchNotion();
    } catch {
      setCreateError('Request failed');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdatePage = async () => {
    const token = await getToken();
    if (!token) return;
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      const res = await fetch('/api/notion-update-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pageId: updatePageId, title: updateTitle }),
      });
      const body = await res.json();
      if (!res.ok) {
        setUpdateError(body.error ?? 'Failed to update page');
        return;
      }
      if (data?.pages) fetchNotion();
      setUpdatePageId('');
      setUpdateTitle('');
    } catch {
      setUpdateError('Request failed');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAppendBlocks = async () => {
    const token = await getToken();
    if (!token || !appendText.trim()) return;
    setAppendLoading(true);
    setAppendError(null);
    try {
      const res = await fetch('/api/notion-append-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          blockId: appendPageId,
          children: [{ type: appendBlockType, content: appendText.trim() }],
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAppendError(body.error ?? 'Failed to append blocks');
        return;
      }
      setAppendText('');
    } catch {
      setAppendError('Request failed');
    } finally {
      setAppendLoading(false);
    }
  };

  const items = Array.isArray(data?.pages) ? data.pages : [];
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.title.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const pages = filteredItems.filter((p) => p.objectType === 'page');
  const databases = filteredItems.filter((p) => p.objectType === 'database');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-[#ffb347] animate-spin" />
        <p className="text-slate-600 font-medium">Loading Notion...</p>
      </div>
    );
  }

  const connected = data?.connected === true;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto">
      <AIChatAssistant />

      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
          <FileText className="w-8 h-8 text-slate-800" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notion</h1>
          <p className="text-slate-600 text-sm">
            {connected
              ? `${items.length} page${items.length !== 1 ? 's' : ''} and databases shared with this app`
              : 'Connect Notion to browse pages and databases'}
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
              Connect your Notion workspace in Onboarding to search and open your pages and databases here.
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

      {connected && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <a
              href="https://notion.so"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              Open in Notion <ExternalLink className="w-4 h-4" />
            </a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              placeholder="Search pages and databases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300"
            />
          </div>

          {items.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">No pages or databases yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Share pages or databases with your Notion integration to see them here.
              </p>
              <a
                href="https://notion.so"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-sm text-slate-600 hover:text-slate-800 font-medium"
              >
                Open Notion <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {(pages.length > 0 || databases.length > 0) && (
            <div className="space-y-6">
              {databases.length > 0 && (
                <section>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <Database className="w-4 h-4 text-slate-600" />
                    Databases ({databases.length})
                  </h2>
                  <ul className="space-y-2">
                    {databases.map((item) => (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-slate-200 bg-card p-4 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="inline-block text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded mb-1">
                            Database
                          </span>
                          <p className="font-medium text-slate-900 truncate">{item.title || 'Untitled'}</p>
                          {item.last_edited_time && (
                            <p className="text-xs text-slate-500 mt-0.5">{formatEdited(item.last_edited_time)}</p>
                          )}
                        </div>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-2 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                            aria-label="Open in Notion"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                </section>
              )}

              {pages.length > 0 && (
                <section>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <File className="w-4 h-4 text-slate-600" />
                    Pages ({pages.length})
                  </h2>
                  <ul className="space-y-2">
                    {pages.map((item) => (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-slate-200 bg-card p-4 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="inline-block text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded mb-1">
                            Page
                          </span>
                          <p className="font-medium text-slate-900 truncate">{item.title || 'Untitled'}</p>
                          {item.last_edited_time && (
                            <p className="text-xs text-slate-500 mt-0.5">{formatEdited(item.last_edited_time)}</p>
                          )}
                        </div>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-2 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                            aria-label="Open in Notion"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                </section>
              )}

              {filteredItems.length === 0 && searchQuery.trim() && (
                <p className="text-center text-slate-500 text-sm py-6">
                  No pages or databases match &quot;{searchQuery.trim()}&quot;
                </p>
              )}
            </div>
          )}

          {/* Query database */}
          <section className="rounded-2xl border border-slate-200 bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setQuerySectionOpen((o) => !o)}
              className="w-full flex items-center gap-2 p-4 text-left font-semibold text-slate-800 hover:bg-slate-50"
            >
              {querySectionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Database className="w-4 h-4 text-slate-600" />
              Query database
            </button>
            {querySectionOpen && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={queryDbId}
                    onChange={(e) => {
                      setQueryDbId(e.target.value);
                      setQueryResult(null);
                      setQueryError(null);
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white min-w-[200px]"
                  >
                    <option value="">Select a database</option>
                    {databases.map((db) => (
                      <option key={db.id} value={db.id}>{db.title || 'Untitled'}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => loadQueryDatabase()}
                    disabled={!queryDbId || queryLoading}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                  >
                    {queryLoading ? 'Loading…' : 'Load rows'}
                  </button>
                </div>
                {queryError && <p className="text-sm text-red-600">{queryError}</p>}
                {queryResult && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {queryResult.database.propertyNames.map((name) => (
                            <th key={name} className="text-left py-2 px-2 font-semibold text-slate-700">{name}</th>
                          ))}
                          <th className="text-left py-2 px-2 font-semibold text-slate-700 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.results.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                            {queryResult.database.propertyNames.map((name) => (
                              <td key={name} className="py-2 px-2 text-slate-900 max-w-[200px] truncate">
                                {String(row.properties[name] ?? '—')}
                              </td>
                            ))}
                            <td className="py-2 px-2">
                              {row.url && (
                                <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-700" aria-label="Open"><ExternalLink className="w-4 h-4" /></a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {queryResult.has_more && queryResult.next_cursor && (
                      <button
                        type="button"
                        onClick={() => loadQueryDatabase(queryResult.next_cursor!)}
                        disabled={queryLoading}
                        className="mt-2 text-sm text-slate-600 hover:text-slate-800 font-medium disabled:opacity-50"
                      >
                        Load more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Create page */}
          <section className="rounded-2xl border border-slate-200 bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setCreateSectionOpen((o) => !o)}
              className="w-full flex items-center gap-2 p-4 text-left font-semibold text-slate-800 hover:bg-slate-50"
            >
              {createSectionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Plus className="w-4 h-4 text-slate-600" />
              Create page
            </button>
            {createSectionOpen && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={createParentType}
                    onChange={(e) => {
                      setCreateParentType(e.target.value as 'database' | 'page');
                      setCreateParentId('');
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="page">Under a page</option>
                    <option value="database">In a database</option>
                  </select>
                  <select
                    value={createParentId}
                    onChange={(e) => setCreateParentId(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white min-w-[220px]"
                  >
                    <option value="">Select {createParentType === 'database' ? 'database' : 'page'}</option>
                    {(createParentType === 'database' ? databases : pages).map((item) => (
                      <option key={item.id} value={item.id}>{item.title || 'Untitled'}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Page title"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex-1 min-w-[200px]"
                  />
                  <button
                    type="button"
                    onClick={handleCreatePage}
                    disabled={!createParentId || !createTitle.trim() || createLoading}
                    className="px-4 py-2 rounded-lg bg-[#ffb347] text-white text-sm font-medium hover:bg-[#ff8c42] disabled:opacity-50"
                  >
                    {createLoading ? 'Creating…' : 'Create'}
                  </button>
                </div>
                {createError && <p className="text-sm text-red-600">{createError}</p>}
                {createdUrl && (
                  <p className="text-sm text-slate-600">
                    Created.{' '}
                    <a href={createdUrl} target="_blank" rel="noopener noreferrer" className="text-[#ff8c42] font-medium hover:underline">
                      Open in Notion
                    </a>
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Update page title */}
          <section className="rounded-2xl border border-slate-200 bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setUpdateSectionOpen((o) => !o)}
              className="w-full flex items-center gap-2 p-4 text-left font-semibold text-slate-800 hover:bg-slate-50"
            >
              {updateSectionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Edit3 className="w-4 h-4 text-slate-600" />
              Update page title
            </button>
            {updateSectionOpen && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={updatePageId}
                    onChange={(e) => setUpdatePageId(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white min-w-[220px]"
                  >
                    <option value="">Select page</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>{p.title || 'Untitled'}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="New title"
                    value={updateTitle}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm flex-1 min-w-[180px]"
                  />
                  <button
                    type="button"
                    onClick={handleUpdatePage}
                    disabled={!updatePageId || !updateTitle.trim() || updateLoading}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                  >
                    {updateLoading ? 'Updating…' : 'Update'}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Works for standalone pages. Database rows use their database&apos;s title property name.</p>
                {updateError && <p className="text-sm text-red-600">{updateError}</p>}
              </div>
            )}
          </section>

          {/* Append blocks */}
          <section className="rounded-2xl border border-slate-200 bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setAppendSectionOpen((o) => !o)}
              className="w-full flex items-center gap-2 p-4 text-left font-semibold text-slate-800 hover:bg-slate-50"
            >
              {appendSectionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <ListPlus className="w-4 h-4 text-slate-600" />
              Append to page
            </button>
            {appendSectionOpen && (
              <div className="p-4 pt-0 space-y-4 border-t border-slate-100">
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={appendPageId}
                    onChange={(e) => setAppendPageId(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white min-w-[220px]"
                  >
                    <option value="">Select page</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>{p.title || 'Untitled'}</option>
                    ))}
                  </select>
                  <select
                    value={appendBlockType}
                    onChange={(e) => setAppendBlockType(e.target.value as 'paragraph' | 'heading_2' | 'bulleted_list_item')}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="paragraph">Paragraph</option>
                    <option value="heading_2">Heading 2</option>
                    <option value="bulleted_list_item">Bullet</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <textarea
                    placeholder="Content to append"
                    value={appendText}
                    onChange={(e) => setAppendText(e.target.value)}
                    rows={2}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-full resize-y"
                  />
                  <button
                    type="button"
                    onClick={handleAppendBlocks}
                    disabled={!appendPageId || !appendText.trim() || appendLoading}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 self-end"
                  >
                    {appendLoading ? '…' : 'Append'}
                  </button>
                </div>
                {appendError && <p className="text-sm text-red-600">{appendError}</p>}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
