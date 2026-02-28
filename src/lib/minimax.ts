/**
 * M.U.S.T.Learn — MiniMax API clients
 * All keys from env; never expose client-side.
 * Rate limits: T2A query max 10/s; consider backoff for production.
 */

const MINIMAX_BASE = "https://api.minimax.io";
const MINIMAX_ANTHROPIC_BASE = "https://api.minimax.io/anthropic";

// ---- M2.5 LLM (Anthropic-compatible) ----

export const M2_MODEL = "MiniMax-M2.5";

/** Content block for multi-turn tool use (assistant: text + tool_use; user: tool_result) */
export type M2ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface M2Message {
  role: "user" | "assistant" | "system";
  content: string | M2ContentBlock[];
}

/**
 * Call MiniMax-M2.5 via Anthropic-compatible API (fetch).
 * Uses MINIMAX_API_KEY_M25 from env.
 */
export async function completeM2(params: {
  system: string;
  messages: M2Message[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY_M25;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.error("[minimax] MINIMAX_API_KEY_M25 is not set");
    throw new Error("MINIMAX_API_KEY_M25 is not set");
  }

  const body = {
    model: M2_MODEL,
    max_tokens: params.maxTokens ?? 4096,
    temperature: Math.min(1, Math.max(0.01, params.temperature ?? 0.7)),
    system: params.system,
    messages: params.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? [{ type: "text" as const, text: m.content }]
          : m.content,
    })),
  };

  const res = await fetch(`${MINIMAX_ANTHROPIC_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Anthropic-Version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    // eslint-disable-next-line no-console
    console.error("[minimax] M2 API error", res.status, err?.slice(0, 300));
    throw new Error(`M2 API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content
    ?.filter((b) => b.type === "text" && b.text)
    .map((b) => (b as { text: string }).text)
    .join("\n");
  return text ?? "";
}

// ---- M2.5 with tool use (for AI assistant) ----

export interface M2ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface M2WithToolsResult {
  /** Plain text from assistant (for display). */
  content: string;
  /** Tool calls to execute (for server-side loop). */
  toolCalls: M2ToolCall[];
  /** Full content array to append to conversation for next round (thinking + text + tool_use). */
  rawAssistantContent: M2ContentBlock[];
}

/** Anthropic-compatible tool definition for MiniMax */
export interface M2Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export async function completeM2WithTools(params: {
  system: string;
  messages: M2Message[];
  tools: M2Tool[];
  maxTokens?: number;
  temperature?: number;
}): Promise<M2WithToolsResult> {
  const apiKey = process.env.MINIMAX_API_KEY_M25;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.error("[minimax] MINIMAX_API_KEY_M25 is not set");
    throw new Error("MINIMAX_API_KEY_M25 is not set");
  }

  const body = {
    model: M2_MODEL,
    max_tokens: params.maxTokens ?? 4096,
    temperature: Math.min(1, Math.max(0.01, params.temperature ?? 0.7)),
    system: params.system,
    tools: params.tools,
    messages: params.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? [{ type: "text" as const, text: m.content }]
          : m.content,
    })),
  };

  // eslint-disable-next-line no-console
  console.log("[minimax] M2 tools request", { messageCount: params.messages.length, toolCount: params.tools.length });
  const res = await fetch(`${MINIMAX_ANTHROPIC_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Anthropic-Version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    // eslint-disable-next-line no-console
    console.error("[minimax] M2 API error", res.status, err?.slice(0, 300));
    throw new Error(`M2 API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    content?: Array<{
      type: string;
      text?: string;
      thinking?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };

  let content = "";
  const toolCalls: M2ToolCall[] = [];
  const rawAssistantContent: M2ContentBlock[] = [];

  for (const block of data.content ?? []) {
    if (block.type === "text" && block.text) {
      content += (content ? "\n" : "") + block.text;
      rawAssistantContent.push({ type: "text", text: block.text });
    }
    if (block.type === "thinking" && block.thinking) {
      rawAssistantContent.push({ type: "text", text: block.thinking });
    }
    if (block.type === "tool_use" && block.id && block.name) {
      const args = typeof block.input === "object" && block.input ? block.input : {};
      toolCalls.push({ id: block.id, name: block.name, arguments: args });
      rawAssistantContent.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: args,
      });
    }
  }

  const out = { content: content.trim(), toolCalls, rawAssistantContent };
  // eslint-disable-next-line no-console
  console.log("[minimax] M2 tools response", { contentLength: out.content.length, toolCallCount: out.toolCalls.length, toolNames: out.toolCalls.map((t) => t.name) });
  return out;
}

// ---- Speech (T2A Async V2) ----

const T2A_CREATE = `${MINIMAX_BASE}/v1/t2a_async_v2`;
const T2A_QUERY = `${MINIMAX_BASE}/v1/query/t2a_async_query_v2`;
const FILES_RETRIEVE = `${MINIMAX_BASE}/v1/files/retrieve`;

export interface T2ACreateResponse {
  task_id?: string;
  file_id?: number;
  base_resp?: { status_code: number; status_msg: string };
}

export interface T2AQueryResponse {
  task_id?: number | string;
  status?: "Success" | "Processing" | "Failed" | "Expired" | "success" | "processing" | "failed" | "expired";
  file_id?: number;
  base_resp?: { status_code: number; status_msg: string };
}

export interface RetrieveFileResponse {
  file?: { file_id: number; download_url?: string; filename?: string };
  base_resp?: { status_code: number; status_msg: string };
}

/** Create async TTS task (speech-2.8-turbo). Uses MINIMAX_API_KEY_SPEECH. */
export async function createT2ATask(text: string): Promise<T2ACreateResponse> {
  const apiKey = process.env.MINIMAX_API_KEY_SPEECH;
  if (!apiKey) throw new Error("MINIMAX_API_KEY_SPEECH is not set");

  const res = await fetch(T2A_CREATE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "speech-2.8-turbo",
      text: text.slice(0, 50000),
      voice_setting: {
        voice_id: "English_Insightful_Speaker",
        speed: 1,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        format: "mp3",
        audio_sample_rate: 32000,
        bitrate: 128000,
        channel: 1,
      },
      language_boost: "English",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`T2A create error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as T2ACreateResponse;
  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`T2A: ${data.base_resp.status_msg ?? "Unknown error"}`);
  }
  return data;
}

/** Poll task status until Success/Failed/Expired. Rate limit: max 10 queries/sec. */
export async function pollT2ATask(
  taskId: string,
  options?: { maxAttempts?: number; intervalMs?: number }
): Promise<T2AQueryResponse> {
  const apiKey = process.env.MINIMAX_API_KEY_SPEECH;
  if (!apiKey) throw new Error("MINIMAX_API_KEY_SPEECH is not set");

  const maxAttempts = options?.maxAttempts ?? 60;
  const intervalMs = options?.intervalMs ?? 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${T2A_QUERY}?task_id=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`T2A query error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as T2AQueryResponse;
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`T2A query: ${data.base_resp.status_msg ?? "Unknown error"}`);
    }

    const status = (data.status ?? "").toLowerCase();
    if (status === "success") return data;
    if (status === "failed" || status === "expired") {
      throw new Error(`T2A task ${status}: ${data.base_resp?.status_msg ?? status}`);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error("T2A task timed out");
}

/** Retrieve file by file_id; returns download_url. */
export async function retrieveFile(fileId: number): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY_SPEECH;
  if (!apiKey) throw new Error("MINIMAX_API_KEY_SPEECH is not set");

  const res = await fetch(`${FILES_RETRIEVE}?file_id=${fileId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`File retrieve error ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as RetrieveFileResponse;
  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`Retrieve: ${data.base_resp.status_msg ?? "Unknown error"}`);
  }
  const url = data.file?.download_url;
  if (!url) throw new Error("No download_url in response");
  return url;
}

/**
 * Full async TTS flow: create → poll → retrieve.
 * Returns public URL for the generated audio (valid ~9 hours).
 */
export async function textToSpeechAsync(text: string): Promise<string> {
  const created = await createT2ATask(text);
  const taskId = created.task_id;
  if (!taskId) throw new Error("No task_id from T2A create");

  const result = await pollT2ATask(String(taskId));
  const fileId = result.file_id;
  if (fileId == null) throw new Error("No file_id after task success");

  return retrieveFile(fileId);
}

// ---- Video (Hailuo-2.3) — text-to-video async ----

const VIDEO_CREATE = `${MINIMAX_BASE}/v1/video_generation`;
const VIDEO_QUERY = `${MINIMAX_BASE}/v1/query/video_generation`;

export interface VideoCreateResponse {
  task_id?: string;
  base_resp?: { status_code: number; status_msg: string };
}

export interface VideoQueryResponse {
  task_id?: string;
  status?: string;
  file_id?: number;
  base_resp?: { status_code: number; status_msg: string };
}

/** Create text-to-video task. Uses MINIMAX_API_KEY_VIDEO. */
export async function createVideoTask(prompt: string): Promise<VideoCreateResponse> {
  const apiKey = process.env.MINIMAX_API_KEY_VIDEO;
  if (!apiKey) throw new Error("MINIMAX_API_KEY_VIDEO is not set");

  const res = await fetch(VIDEO_CREATE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "MiniMax-Hailuo-2.3",
      prompt: prompt.slice(0, 2000),
      duration: 6,
      resolution: "768P",
    }),
  });

  if (!res.ok) throw new Error(`Video create error ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as VideoCreateResponse;
  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`Video: ${data.base_resp.status_msg ?? "Unknown error"}`);
  }
  return data;
}

/** Query video task status. Returns file_id when status is Success. */
export async function queryVideoTask(taskId: string): Promise<VideoQueryResponse> {
  const apiKey = process.env.MINIMAX_API_KEY_VIDEO;
  if (!apiKey) throw new Error("MINIMAX_API_KEY_VIDEO is not set");

  const res = await fetch(`${VIDEO_QUERY}?task_id=${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Video query error ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as VideoQueryResponse;
  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`Video query: ${data.base_resp.status_msg ?? "Unknown error"}`);
  }
  return data;
}

/** Retrieve video file URL by file_id. Uses MINIMAX_API_KEY_VIDEO. */
export async function retrieveVideoFile(fileId: number): Promise<string> {
  const apiKey = process.env.MINIMAX_API_KEY_VIDEO;
  if (!apiKey) throw new Error("MINIMAX_API_KEY_VIDEO is not set");

  const res = await fetch(`${FILES_RETRIEVE}?file_id=${fileId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Video file retrieve error ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as RetrieveFileResponse;
  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`Retrieve: ${data.base_resp.status_msg ?? "Unknown error"}`);
  }
  const url = data.file?.download_url;
  if (!url) throw new Error("No download_url in response");
  return url;
}

/** Poll video task until Success/Fail; returns video URL. */
export async function pollVideoTaskUntilDone(
  taskId: string,
  options?: { maxAttempts?: number; intervalMs?: number }
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? 120;
  const intervalMs = options?.intervalMs ?? 3000;

  for (let i = 0; i < maxAttempts; i++) {
    const result = await queryVideoTask(taskId);
    const status = (result.status ?? "").toLowerCase();
    if (status === "success" && result.file_id != null) {
      return retrieveVideoFile(result.file_id);
    }
    if (status === "fail") {
      throw new Error(`Video task failed: ${result.base_resp?.status_msg ?? "Unknown"}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Video task timed out");
}

// ---- Music (music-2.5) ----

const MUSIC_CREATE = `${MINIMAX_BASE}/v1/music_generation`;

export interface MusicCreateResponse {
  data?: {
    status?: number;
    audio?: string;
    url?: string;
  };
  base_resp?: { status_code: number; status_msg: string };
}

/** Generate music from lyrics + optional prompt. Uses MINIMAX_API_KEY_MUSIC. Returns audio URL when output_format is url. */
export async function createMusicTask(params: {
  lyrics: string;
  prompt?: string;
}): Promise<{ audioUrl?: string }> {
  const apiKey = process.env.MINIMAX_API_KEY_MUSIC;
  if (!apiKey) throw new Error("MINIMAX_API_KEY_MUSIC is not set");

  const res = await fetch(MUSIC_CREATE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "music-2.5",
      lyrics: params.lyrics.slice(0, 3500),
      prompt: (params.prompt ?? "Indie, ambient, study focus").slice(0, 2000),
      output_format: "url",
      audio_setting: { sample_rate: 44100, bitrate: 256000, format: "mp3" },
    }),
  });

  if (!res.ok) throw new Error(`Music error ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as MusicCreateResponse;
  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`Music: ${data.base_resp.status_msg ?? "Unknown error"}`);
  }

  // When output_format is url, response may include url in data
  const url = data.data?.url ?? (data.data as { audio_url?: string })?.audio_url;
  if (url) return { audioUrl: url };
  // Some docs show hex audio in data.audio when status=2; url might be in extra_info
  const extra = (data as { extra_info?: { audio_url?: string } }).extra_info;
  if (extra?.audio_url) return { audioUrl: extra.audio_url };
  return {};
}
