/**
 * Vercel serverless: POST /api/video (create) or GET /api/video?task_id=xxx (query once).
 * Text-to-video via MiniMax Hailuo (MINIMAX_API_KEY_VIDEO).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createVideoTask,
  queryVideoTask,
  retrieveVideoFile,
  pollVideoTaskUntilDone,
} from "../src/lib/minimax";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method === "POST") {
    const prompt =
      typeof (req.body as { prompt?: string })?.prompt === "string"
        ? (req.body as { prompt: string }).prompt.trim()
        : "";
    if (!prompt) {
      res.status(400).json({ error: "Missing or empty 'prompt' in body." });
      return;
    }
    try {
      const created = await createVideoTask(prompt);
      if (!created.task_id) {
        res.status(500).json({ error: "No task_id from video API." });
        return;
      }
      res.status(200).json({ task_id: created.task_id });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Video create failed.";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "GET") {
    const taskId =
      typeof req.query?.task_id === "string"
        ? req.query.task_id.trim()
        : Array.isArray(req.query?.task_id)
          ? String(req.query.task_id[0] ?? "").trim()
          : "";
    if (!taskId) {
      res.status(400).json({ error: "Missing 'task_id' query." });
      return;
    }
    try {
      const result = await queryVideoTask(taskId);
      const status = (result.status ?? "").toLowerCase();
      if (status === "success" && result.file_id != null) {
        const videoUrl = await retrieveVideoFile(result.file_id);
        res.status(200).json({ status: "success", video_url: videoUrl });
        return;
      }
      if (status === "fail") {
        res.status(200).json({
          status: "fail",
          error: result.base_resp?.status_msg ?? "Task failed",
        });
        return;
      }
      res.status(200).json({ status: status || "processing" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Video query failed.";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
