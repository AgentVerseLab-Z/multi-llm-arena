import { NextRequest } from "next/server";
import { loadModels, getApiKey } from "@/lib/config";
import { webSearch } from "@/lib/web-search";
import type { ModelConfig } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** Web search tool definition (OpenAI-compatible format) */
const WEB_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "web_search",
    description:
      "在互联网上搜索实时信息。当用户的问题涉及最新新闻、实时数据（天气/股价/汇率）、时效性信息、或需要验证事实时，使用此工具获取最新信息。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索关键词，建议使用简洁明确的关键词",
        },
      },
      required: ["query"],
    },
  },
};

/** Max tool calling rounds to prevent infinite loops */
const MAX_TOOL_ROUNDS = 3;

/** Qwen provider name */
const QWEN_PROVIDER = "qwen";

export async function POST(req: NextRequest) {
  const { message, modelIds, history, enableSearch } = (await req.json()) as {
    message: string;
    modelIds: string[];
    history?: Record<string, ChatMessage[]>;
    enableSearch?: boolean;
  };

  if (!message || !modelIds?.length) {
    return new Response(JSON.stringify({ error: "Missing message or modelIds" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const allModels = loadModels();
  const selectedModels = modelIds
    .map((id) => allModels.find((m) => m.id === id && m.enabled))
    .filter(Boolean) as ModelConfig[];

  if (!selectedModels.length) {
    return new Response(JSON.stringify({ error: "No valid models found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tasks = selectedModels.map(async (model) => {
        const apiKey = getApiKey(model);
        if (!apiKey) {
          send({ type: "error", modelId: model.id, error: `API Key not configured (${model.apiKeyEnv})` });
          return;
        }

        send({ type: "start", modelId: model.id });
        const startTime = Date.now();

        try {
          const messages: ChatMessage[] = [];
          if (history?.[model.id]) {
            messages.push(...history[model.id]);
          }
          messages.push({ role: "user", content: message });

          const searchEnabled = !!(enableSearch && model.supportsSearch);
          const isQwen = model.provider === QWEN_PROVIDER;

          if (searchEnabled && isQwen) {
            // Qwen models: use DashScope native enable_search
            await callQwenWithSearch(model, apiKey, messages, send);
          } else if (searchEnabled) {
            // Other models: use Tool Calling + Bocha search
            await callModelWithTools(model, apiKey, messages, send);
          } else {
            // No search: plain chat
            await callModelPlain(model, apiKey, messages, send);
          }

          const latencyMs = Date.now() - startTime;
          send({ type: "done", modelId: model.id, latencyMs });
        } catch (err) {
          send({
            type: "error",
            modelId: model.id,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      });

      await Promise.allSettled(tasks);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Qwen models: use DashScope native enable_search parameter
 */
async function callQwenWithSearch(
  model: ModelConfig,
  apiKey: string,
  messages: ChatMessage[],
  send: (data: Record<string, unknown>) => void,
): Promise<void> {
  const body: Record<string, unknown> = {
    model: model.modelId,
    messages,
    max_tokens: model.maxTokens,
    temperature: model.temperature,
    stream: true,
    enable_search: true,
  };

  await streamModelResponse(model, apiKey, body, send);
}

/**
 * Non-Qwen models: use Tool Calling + Bocha web search
 */
async function callModelWithTools(
  model: ModelConfig,
  apiKey: string,
  messages: ChatMessage[],
  send: (data: Record<string, unknown>) => void,
): Promise<void> {
  const tools = [WEB_SEARCH_TOOL];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const body: Record<string, unknown> = {
      model: model.modelId,
      messages,
      max_tokens: model.maxTokens,
      temperature: model.temperature,
      stream: true,
      tools,
    };

    const reader = await fetchModelStream(model, apiKey, body);
    if (!reader) {
      send({ type: "error", modelId: model.id, error: "No response body" });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let hasContent = false;
    const toolCalls: Map<number, ToolCall> = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          const choice = parsed.choices?.[0];
          const delta = choice?.delta;

          if (delta?.content) {
            hasContent = true;
            send({ type: "chunk", modelId: model.id, content: delta.content });
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls.has(idx)) {
                toolCalls.set(idx, {
                  id: tc.id || `call_${idx}`,
                  type: "function",
                  function: { name: "", arguments: "" },
                });
              }
              const existing = toolCalls.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    // If no tool calls, we're done
    if (toolCalls.size === 0) return;

    const assistantToolCalls = Array.from(toolCalls.values());

    // Notify frontend: search in progress
    for (const tc of assistantToolCalls) {
      if (tc.function.name === "web_search") {
        try {
          const args = JSON.parse(tc.function.arguments);
          send({ type: "search_status", modelId: model.id, query: args.query, status: "searching" });
        } catch { /* ignore */ }
      }
    }

    // Add assistant message with tool calls
    messages.push({ role: "assistant", content: "", tool_calls: assistantToolCalls });

    // Execute each tool call
    for (const tc of assistantToolCalls) {
      let result = "";

      if (tc.function.name === "web_search") {
        try {
          const args = JSON.parse(tc.function.arguments);
          const searchResults = await webSearch(args.query || "", 5);

          if (searchResults.length > 0) {
            result = searchResults
              .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\n${r.url}`)
              .join("\n\n");
          } else {
            result = "未找到相关搜索结果。";
          }

          send({
            type: "search_status",
            modelId: model.id,
            query: args.query,
            status: "done",
            resultCount: searchResults.length,
          });
        } catch (err) {
          result = `搜索出错: ${err instanceof Error ? err.message : "Unknown error"}`;
          send({ type: "search_status", modelId: model.id, status: "error", error: result });
        }
      } else {
        result = `未知工具: ${tc.function.name}`;
      }

      messages.push({ role: "tool", content: result, tool_call_id: tc.id });
    }

    // Continue loop — model will process tool results and generate final answer
  }
}

/**
 * Plain chat without search
 */
async function callModelPlain(
  model: ModelConfig,
  apiKey: string,
  messages: ChatMessage[],
  send: (data: Record<string, unknown>) => void,
): Promise<void> {
  const body: Record<string, unknown> = {
    model: model.modelId,
    messages,
    max_tokens: model.maxTokens,
    temperature: model.temperature,
    stream: true,
  };

  await streamModelResponse(model, apiKey, body, send);
}

/**
 * Fetch model stream response
 */
async function fetchModelStream(
  model: ModelConfig,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<ReadableStreamDefaultReader<Uint8Array> | null> {
  const res = await fetch(`${model.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  return res.body?.getReader() || null;
}

/**
 * Stream model response and send chunks
 */
async function streamModelResponse(
  model: ModelConfig,
  apiKey: string,
  body: Record<string, unknown>,
  send: (data: Record<string, unknown>) => void,
): Promise<void> {
  const reader = await fetchModelStream(model, apiKey, body);
  if (!reader) {
    send({ type: "error", modelId: model.id, error: "No response body" });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") continue;

      try {
        const parsed = JSON.parse(payload);
        const choice = parsed.choices?.[0];
        const delta = choice?.delta;

        if (delta?.content) {
          send({ type: "chunk", modelId: model.id, content: delta.content });
        }

        // Handle tool calls display (for plain mode, just show info)
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const fnName = tc.function?.name || "";
            const fnArgs = tc.function?.arguments || "";
            if (fnName || fnArgs) {
              send({
                type: "chunk",
                modelId: model.id,
                content: `\n\n> 🔧 工具调用: \`${fnName}\`(${fnArgs})\n> *（当前不支持工具执行，请直接提问获取结果）*\n`,
              });
            }
          }
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
}
