import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "motion/react";
import { FolderOpen, FileText, Loader2, RefreshCw, UploadCloud, Trash2, Download, Eye, FolderPlus, Folder, MoreHorizontal, Pencil } from "lucide-react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Upload } from "./Upload";

const FOLDER_STORAGE_KEY = "mustlearn_library_folders_";

interface LibraryItem {
  key: string;
  size: number;
  lastModified: string | null;
}

interface LibraryFolder {
  id: string;
  name: string;
}

interface FolderState {
  folders: LibraryFolder[];
  fileToFolder: Record<string, string>;
}

function loadFolderState(userId: string): FolderState {
  try {
    const raw = localStorage.getItem(FOLDER_STORAGE_KEY + userId);
    if (!raw) return { folders: [], fileToFolder: {} };
    const parsed = JSON.parse(raw) as FolderState;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      fileToFolder: parsed.fileToFolder && typeof parsed.fileToFolder === "object" ? parsed.fileToFolder : {},
    };
  } catch {
    return { folders: [], fileToFolder: {} };
  }
}

function saveFolderState(userId: string, state: FolderState) {
  try {
    localStorage.setItem(FOLDER_STORAGE_KEY + userId, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

const UNCATEGORIZED = "__uncategorized__";

function FolderSection({
  title,
  folderId,
  items,
  folders,
  fileToFolder,
  selectedKeys,
  loadingKey,
  loadingAction,
  onToggleSelected,
  onPreview,
  onDownload,
  onDelete,
  onMoveToFolder,
  formatSize,
  isCustomFolder,
  onRename,
  onRenameSubmit,
  onRemoveFolder,
  editingFolderId,
  editingName,
  setEditingName,
  setEditingFolderId,
}: {
  title: string;
  folderId: string;
  items: LibraryItem[];
  folders: LibraryFolder[];
  fileToFolder: Record<string, string>;
  selectedKeys: string[];
  loadingKey: string | null;
  loadingAction: "preview" | "download" | null;
  onToggleSelected: (key: string) => void;
  onPreview: (item: LibraryItem) => void;
  onDownload: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
  onMoveToFolder: (fileKey: string, folderId: string | null) => void;
  formatSize: (bytes: number) => string;
  isCustomFolder?: boolean;
  onRename?: () => void;
  onRenameSubmit?: (name: string) => void;
  onRemoveFolder?: () => void;
  editingFolderId?: string | null;
  editingName?: string;
  setEditingName?: (s: string) => void;
  setEditingFolderId?: (id: string | null) => void;
}) {
  const isEditing = isCustomFolder && editingFolderId === folderId;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <Folder className="w-5 h-5 text-[#ffb347]" />
        {isEditing && setEditingName && setEditingFolderId && onRenameSubmit ? (
          <form
            className="flex-1 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onRenameSubmit(editingName ?? title);
            }}
          >
            <Input
              value={editingName ?? title}
              onChange={(e) => setEditingName(e.target.value)}
              className="h-8 flex-1 max-w-xs"
              autoFocus
            />
            <Button type="submit" size="sm">Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFolderId(null)}>Cancel</Button>
          </form>
        ) : (
          <>
            <span className="font-semibold text-foreground">{title}</span>
            {isCustomFolder && onRename && onRemoveFolder && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="ml-auto p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onRename}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onRemoveFolder} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {items.length === 0 && isCustomFolder ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            No files in this folder. Use &quot;Move to folder&quot; on a file to add it here.
          </li>
        ) : (
          items.map((item) => {
          const name = item.key.split("/").pop() || item.key;
          const last =
            item.lastModified && !Number.isNaN(Date.parse(item.lastModified))
              ? new Date(item.lastModified).toLocaleString()
              : "Unknown";
          return (
            <li key={item.key} className="flex items-center gap-4 px-4 py-3 min-w-0">
              <div className="flex-shrink-0">
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(item.key)}
                  onChange={() => onToggleSelected(item.key)}
                  className="h-4 w-4 rounded border-slate-300 text-[#ffb347] focus:ring-[#ffb347]"
                />
              </div>
              <div className="flex-shrink-0">
                <FileText className="w-5 h-5 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-foreground" title={name}>{name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate" title={`${formatSize(item.size)} • ${last}`}>
                  {formatSize(item.size)} • {last}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                      title="Move to folder"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onMoveToFolder(item.key, null)}>
                      Uncategorized
                    </DropdownMenuItem>
                    {folders.map((f) => (
                      <DropdownMenuItem key={f.id} onClick={() => onMoveToFolder(item.key, f.id)}>
                        {f.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <button
                  type="button"
                  onClick={() => void onPreview(item)}
                  disabled={loadingKey === item.key}
                  className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground disabled:opacity-50"
                  title="Preview (open in new tab)"
                >
                  {loadingKey === item.key && loadingAction === "preview" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void onDownload(item)}
                  disabled={loadingKey === item.key}
                  className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground disabled:opacity-50"
                  title="Download"
                >
                  {loadingKey === item.key && loadingAction === "download" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(item)}
                  className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          );
          })
        )}
      </ul>
    </div>
  );
}

export function Library() {
  const { user } = useUser();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [synthLoading, setSynthLoading] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"preview" | "download" | null>(null);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [fileToFolder, setFileToFolder] = useState<Record<string, string>>({});
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("New folder");
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    const state = loadFolderState(user.id);
    setFolders(state.folders);
    setFileToFolder(state.fileToFolder);
  }, [user?.id]);

  const persistFolders = useCallback(() => {
    if (!user?.id) return;
    saveFolderState(user.id, { folders, fileToFolder });
  }, [user?.id, folders, fileToFolder]);

  useEffect(() => {
    persistFolders();
  }, [folders, fileToFolder, persistFolders]);

  function addFolder(name: string) {
    const trimmed = name.trim() || "New folder";
    setFolders((prev) => [...prev, { id: `folder-${Date.now()}`, name: trimmed }]);
  }

  function renameFolder(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
    setEditingFolderId(null);
  }

  function removeFolder(id: string) {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setFileToFolder((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === id) delete next[key];
      });
      return next;
    });
  }

  function setFileFolder(fileKey: string, folderId: string | null) {
    if (folderId === null || folderId === UNCATEGORIZED) {
      setFileToFolder((prev) => {
        const next = { ...prev };
        delete next[fileKey];
        return next;
      });
    } else {
      setFileToFolder((prev) => ({ ...prev, [fileKey]: folderId }));
    }
  }

  const itemsByFolder = useCallback(() => {
    const uncategorized: LibraryItem[] = [];
    const byFolder: Record<string, LibraryItem[]> = {};
    folders.forEach((f) => {
      byFolder[f.id] = [];
    });
    items.forEach((item) => {
      const folderId = fileToFolder[item.key];
      if (!folderId || !folders.some((f) => f.id === folderId)) {
        uncategorized.push(item);
      } else {
        if (!byFolder[folderId]) byFolder[folderId] = [];
        byFolder[folderId].push(item);
      }
    });
    return { uncategorized, byFolder };
  }, [items, folders, fileToFolder])();

  async function getFileUrl(objectKey: string): Promise<string> {
    const res = await fetch("/api/storage-download-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectKey }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error ?? "Failed to get file URL");
    return data.url;
  }

  async function handlePreview(item: LibraryItem) {
    setLoadingKey(item.key);
    setLoadingAction("preview");
    try {
      const url = await getFileUrl(item.key);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Could not open file for preview");
    } finally {
      setLoadingKey(null);
      setLoadingAction(null);
    }
  }

  async function handleDownload(item: LibraryItem) {
    const name = item.key.split("/").pop() || item.key;
    setLoadingKey(item.key);
    setLoadingAction("download");
    try {
      const url = await getFileUrl(item.key);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError("Could not download file");
    } finally {
      setLoadingKey(null);
      setLoadingAction(null);
    }
  }

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
      setSelectedKeys((prev) => prev.filter((k) => items.some((it) => it.key === k)));
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
      setSelectedKeys((prev) => prev.filter((k) => k !== item.key));
    } catch {
      // Ignore; user can retry via refresh
    }
  }

  function toggleSelected(key: string) {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function synthesizeSelected() {
    if (!selectedKeys.length) return;
    setSynthLoading(true);
    try {
      const selectedItems = items.filter((it) => selectedKeys.includes(it.key));
      const parts: string[] = [];
      for (const item of selectedItems) {
        const name = item.key.split("/").pop() || item.key;
        const res = await fetch("/api/storage-download-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectKey: item.key }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) continue;
        const fileRes = await fetch(data.url as string);
        const text = await fileRes.text();
        if (text && text.trim().length > 0) {
          parts.push(`# Source: ${name}\n\n${text}`);
        }
      }

      const combined = parts.join("\n\n---\n\n");
      if (!combined.trim()) {
        setError("Could not read selected files as text.");
        return;
      }

      navigate("/dashboard/synthesize", {
        state: { materialsFromLibrary: combined },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to prepare synthesis";
      setError(msg);
    } finally {
      setSynthLoading(false);
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

          <button
            type="button"
            onClick={() => void synthesizeSelected()}
            disabled={!selectedKeys.length || synthLoading}
            className="inline-flex items-center gap-1 rounded-xl border border-[#ffb347]/40 bg-[#ffb347]/10 px-3 py-2 text-xs font-medium text-[#b4690e] hover:bg-[#ffb347]/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {synthLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-sm leading-none">Synthesize selected</span>
            )}
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
                <p className="text-sm text-muted-foreground mb-4">
                  Add notes, PDFs, or other learning materials. They're stored securely and can be used for synthesis and search.
                </p>
                <Upload embedded />
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

      {items.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Dialog open={newFolderOpen} onOpenChange={(open) => {
              setNewFolderOpen(open);
              if (!open) setNewFolderName("New folder");
            }}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setNewFolderOpen(true)}
              >
                <FolderPlus className="w-4 h-4" />
                New folder
              </Button>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>New folder</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <label htmlFor="folder-name" className="text-sm font-medium text-foreground block mb-2">
                    Folder name
                  </label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="New folder"
                    className="w-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFolder(newFolderName.trim() || "New folder");
                        setNewFolderOpen(false);
                        setNewFolderName("New folder");
                      }
                    }}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      addFolder(newFolderName.trim() || "New folder");
                      setNewFolderOpen(false);
                      setNewFolderName("New folder");
                    }}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {itemsByFolder.uncategorized.length > 0 && (
              <FolderSection
                title="Uncategorized"
                folderId={UNCATEGORIZED}
                items={itemsByFolder.uncategorized}
                folders={folders}
                fileToFolder={fileToFolder}
                selectedKeys={selectedKeys}
                loadingKey={loadingKey}
                loadingAction={loadingAction}
                onToggleSelected={toggleSelected}
                onPreview={handlePreview}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onMoveToFolder={setFileFolder}
                formatSize={formatSize}
              />
            )}
            {folders.map((folder) => {
              const folderItems = itemsByFolder.byFolder[folder.id] ?? [];
              return (
                <FolderSection
                  key={folder.id}
                  title={folder.name}
                  folderId={folder.id}
                  items={folderItems}
                  folders={folders}
                  fileToFolder={fileToFolder}
                  selectedKeys={selectedKeys}
                  loadingKey={loadingKey}
                  loadingAction={loadingAction}
                  onToggleSelected={toggleSelected}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onMoveToFolder={setFileFolder}
                  formatSize={formatSize}
                  isCustomFolder
                  onRename={() => {
                    setEditingFolderId(folder.id);
                    setEditingName(folder.name);
                  }}
                  onRenameSubmit={(name) => renameFolder(folder.id, name)}
                  onRemoveFolder={() => removeFolder(folder.id)}
                  editingFolderId={editingFolderId}
                  editingName={editingName}
                  setEditingName={setEditingName}
                  setEditingFolderId={setEditingFolderId}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

