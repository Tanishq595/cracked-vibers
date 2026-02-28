/**
 * M.U.S.T.Learn — MiniMax API clients
 * All keys from env; never expose client-side.
 * Rate limits: T2A query max 10/s; consider backoff for production.
 */

const MINIMAX_BASE = "https://api.minimax.io";
const MINIMAX_ANTHROPIC_BASE = "https://api.minimax.io/anthropic";

// ---- M2.5 LLM (Anthropic-compatible) ----

export const M2_MODEL = "MiniMax-M2.5";

export interface M2Message {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: "text"; text: string }>;
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
  if (!apiKey) throw new Error("MINIMAX_API_KEY_M25 is not set");

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
  });

  if (!res.ok) {
    const err = await res.text();
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

// ---- Video (Hailuo-2.3) — stub for text-to-video async ----

export async function createVideoTask(_prompt: string): Promise<{ task_id?: string }> {
  // TODO: POST to MiniMax video async endpoint; use MINIMAX_API_KEY_VIDEO
  return { task_id: undefined };
}

export async function pollVideoTask(_taskId: string): Promise<{ video_url?: string }> {
  return {};
}

// ---- Music (music-2.5) — stub ----

export async function createMusicTask(_prompt: string): Promise<{ task_id?: string }> {
  // TODO: use MINIMAX_API_KEY_MUSIC when integrating
  return { task_id: undefined };
}
