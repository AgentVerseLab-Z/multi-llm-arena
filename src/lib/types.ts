/** Model configuration (stored in data/models.json) */
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  baseUrl: string;
  apiKeyEnv: string;  // env var name for API key
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  color: string;
  icon: string;
  supportsSearch?: boolean;  // whether this model supports web search via tool calling
}

/** Public model info (sent to frontend, no sensitive data) */
export type ModelPublic = Omit<ModelConfig, "apiKeyEnv">;

/** Chat message */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelId?: string;
  latencyMs?: number;
  isStreaming?: boolean;
  error?: string;
}

/** Model-specific chat state */
export interface ModelChatState {
  modelId: string;
  messages: Message[];
  isStreaming: boolean;
}

/** SSE event types from /api/chat */
export type SSEEvent =
  | { type: "start"; modelId: string }
  | { type: "chunk"; modelId: string; content: string }
  | { type: "done"; modelId: string; latencyMs: number }
  | { type: "error"; modelId: string; error: string }
  | { type: "search_status"; modelId: string; query?: string; status: "searching" | "done" | "error"; resultCount?: number; error?: string };
