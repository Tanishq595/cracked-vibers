import { useState, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload as UploadIcon,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Cloud,
  Trash2,
} from "lucide-react";

type FileStatus = "pending" | "uploading" | "done" | "error";

interface QueuedFile {
  file: File;
  status: FileStatus;
  error?: string;
  objectKey?: string;
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export function Upload() {
  const { user } = useUser();
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback((newFiles: FileList | File[] | null) => {
    if (!newFiles?.length) return;
    const list = Array.from(newFiles).map((file) => ({
      file,
      status: "pending" as FileStatus,
    }));
    setFiles((prev) => [...prev, ...list]);
  }, []);

  const removeFile = async (index: number) => {
    const item = files[index];
    if (!item) return;

    // If the file was uploaded and we have an objectKey, also delete from storage.
    if (item.status === "done" && item.objectKey) {
      try {
        await fetch("/api/storage-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectKey: item.objectKey }),
        });
      } catch {
        // Swallow delete errors; still remove from local list.
      }
    }

    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, update: Partial<QueuedFile>) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...update } : f))
    );
  };

  const uploadOne = async (index: number) => {
    const item = files[index];
    if (!item || item.status !== "pending") return;

    updateFile(index, { status: "uploading" });

    const prefix = user?.id ? `uploads/${user.id}` : "uploads";
    const objectKey = `${prefix}/${Date.now()}-${sanitize(item.file.name)}`;
    const contentType = item.file.type || "application/octet-stream";

    try {
      const res = await fetch("/api/storage-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectKey, contentType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get upload URL");

      const url = data.url;
      if (!url) throw new Error("No upload URL returned");

      await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: item.file,
      });

      updateFile(index, { status: "done", objectKey });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      updateFile(index, { status: "error", error: message });
    }
  };

  const uploadAll = async () => {
    const pending = files
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.status === "pending");
    if (pending.length === 0) return;

    setUploading(true);
    for (const { i } of pending) {
      await uploadOne(i);
    }
    setUploading(false);
  };

  const clearDone = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "done" && f.status !== "error"));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upload files</h1>
        <p className="mt-1 text-muted-foreground">
          Add notes, PDFs, or other learning materials. They’re stored securely and can be used for synthesis and search.
        </p>
      </div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragActive
            ? "border-[#ff8c42] bg-[#ffb347]/10"
            : "border-slate-300 dark:border-slate-600 bg-card hover:border-[#ffb347]/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Cloud className="mx-auto h-12 w-12 text-[#ffb347] mb-4" />
        <p className="text-foreground font-medium">
          Drag files here or click to browse
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          PDF, text, images, or any file type
        </p>
      </motion.div>

      {/* Queue and actions */}
      <AnimatePresence mode="wait">
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {files.length} file(s) • {pendingCount} pending • {doneCount} uploaded
              </p>
              <div className="flex gap-2">
                {pendingCount > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={uploadAll}
                    disabled={uploading}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white font-semibold shadow-lg disabled:opacity-70"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <UploadIcon className="inline w-4 h-4 mr-2" />
                        Upload all
                      </>
                    )}
                  </motion.button>
                )}
                {(doneCount > 0 || files.some((f) => f.status === "error")) && (
                  <button
                    type="button"
                    onClick={clearDone}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-foreground font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Clear list
                  </button>
                )}
              </div>
            </div>

            <ul className="space-y-2">
              <AnimatePresence>
                {files.map((item, index) => (
                  <motion.li
                    key={`${item.file.name}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center gap-4 rounded-xl bg-card border border-slate-200 dark:border-slate-700 p-3 min-w-0"
                  >
                    <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-foreground truncate" title={item.file.name}>
                        {item.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(item.file.size / 1024).toFixed(1)} KB
                        {item.status === "done" && " • Uploaded"}
                      </p>
                      {item.error && (
                        <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => uploadOne(index)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                          title="Upload this file"
                        >
                          <UploadIcon className="w-4 h-4" />
                        </button>
                      )}
                      {item.status === "uploading" && (
                        <Loader2 className="w-5 h-5 text-[#ffb347] animate-spin" />
                      )}
                      {item.status === "done" && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                      {item.status === "error" && (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {files.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground"
        >
          No files selected. Drop or choose files above.
        </motion.p>
      )}
    </div>
  );
}
