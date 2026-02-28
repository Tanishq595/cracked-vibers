import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "motion/react";
import { FolderOpen, FileText, Loader2, RefreshCw, UploadCloud, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Upload } from "./Upload";

interface LibraryItem {
  key: string;
  size: number;
  lastModified: string | null;
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

export function Library() {
  const { user } = useUser();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prefix = user?.id ? `uploads/${user.id}` : "uploads";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/storage-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load files");

      const items: LibraryItem[] = Array.isArray(data.items) ? data.items : [];
      // Newest first
      items.sort((a, b) => {
        const da = a.lastModified ? Date.parse(a.lastModified) : 0;
        const db = b.lastModified ? Date.parse(b.lastModified) : 0;
        return db - da;
      });
      setItems(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);

  async function handleDelete(item: LibraryItem) {
    try {
      await fetch("/api/storage-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey: item.key }),
      });
      setItems((prev) => prev.filter((it) => it.key !== item.key));
    } catch {
      // Ignore; user can retry via refresh
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[#ffb347]" />
            Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View all files you&lsquo;ve uploaded to M.U.S.T.Learn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-medium text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffb347] to-[#ff8c42] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md hover:shadow-lg"
              >
                <UploadCloud className="w-4 h-4" />
                Upload
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Upload files</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                <Upload />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading files…
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 px-6 py-10 text-center text-sm text-muted-foreground">
          No files found yet. Click <span className="font-semibold text-[#ff8c42]">Upload</span> to add your first
          materials.
        </div>
      )}

      <AnimatePresence>
        {items.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card"
          >
            {items.map((item) => {
              const name = item.key.split("/").pop() || item.key;
              const folder = item.key.includes("/") ? item.key.split("/").slice(0, -1).join("/") : "";
              const last =
                item.lastModified && !Number.isNaN(Date.parse(item.lastModified))
                  ? new Date(item.lastModified).toLocaleString()
                  : "Unknown";
              return (
                <li key={item.key} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {folder && <span className="mr-1 text-slate-400">{folder}•</span>}
                      {formatSize(item.size)} • {last}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item)}
                    className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

