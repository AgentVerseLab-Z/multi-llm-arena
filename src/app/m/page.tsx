"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import MobileChatPanel from "@/components/mobile/MobileChatPanel";
import MobileComposer from "@/components/mobile/MobileComposer";
import MobileSessionDrawer from "@/components/mobile/MobileSessionDrawer";
import MobileShell from "@/components/mobile/MobileShell";
import MobileSheet from "@/components/mobile/MobileSheet";
import type { Message, ModelPublic, SSEEvent } from "@/lib/types";

/**
 * 文件说明：移动端对话首页。
 * 作者：Codex
 * 用途：提供独立移动端多模型对话 UI，复用现有会话、消息和聊天 API。
 */

interface SessionInfo {
  id: string;
  title: string;
  modelIds: string[];
  messageCount: number;
  updatedAt: string;
}

/**
 * 功能：渲染移动端多模型对话页。
 * 入参：无。
 * 出参：React 页面节点。
 * 异常：未登录跳转 /m/login；接口错误尽量静默容错并保留当前 UI。
 * 示例：访问 /m。
 */
export default function MobileChatPage() {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [user, setUser] = useState<{ username: string; role: string; userId: string } | null>(null);
  const [models, setModels] = useState<ModelPublic[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [enableSearch, setEnableSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then(setUser)
      .catch(() => router.push("/m/login"));
  }, [router]);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        setModels(data);
        setSelectedIds(new Set(data.filter((model: ModelPublic) => model.enabled).map((model: ModelPublic) => model.id)));
      })
      .finally(() => setLoading(false));
  }, []);

  const refreshSessions = useCallback(() => {
    fetch("/api/sessions")
      .then((res) => {
        if (!res.ok) throw new Error("sessions");
        return res.json();
      })
      .then(setSessions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) refreshSessions();
  }, [user, refreshSessions]);

  const loadSession = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) return;
    const data = await res.json();

    const modelIds = Array.from(
      new Set(data.messages.filter((msg: { modelId: string | null }) => msg.modelId).map((msg: { modelId: string }) => msg.modelId))
    ) as string[];
    const userMsgs = data.messages.filter((msg: { role: string }) => msg.role === "user");
    const result: Record<string, Message[]> = {};

    modelIds.forEach((modelId) => {
      result[modelId] = [];
      const modelMsgs = data.messages.filter((msg: { modelId: string | null }) => msg.modelId === modelId);
      let ui = 0;
      let mi = 0;
      while (ui < userMsgs.length || mi < modelMsgs.length) {
        if (ui < userMsgs.length && (mi >= modelMsgs.length || new Date(userMsgs[ui].createdAt) <= new Date(modelMsgs[mi].createdAt))) {
          result[modelId].push({ id: `${userMsgs[ui].id}-${modelId}`, role: "user", content: userMsgs[ui].content });
          ui++;
        } else if (mi < modelMsgs.length) {
          result[modelId].push({
            id: modelMsgs[mi].id,
            role: "assistant",
            content: modelMsgs[mi].content,
            modelId,
            latencyMs: modelMsgs[mi].latencyMs || undefined,
            error: modelMsgs[mi].error || undefined,
          });
          mi++;
        }
      }
    });

    setMessages(result);
    setSelectedIds(new Set(data.modelIds));
    setMaximizedId(null);
  }, []);

  const handleCreateSession = useCallback(async () => {
    const enabledModels = models.filter((model) => model.enabled);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新会话", modelIds: enabledModels.map((model) => model.id) }),
    });
    if (!res.ok) return;
    const session = await res.json();
    setActiveSessionId(session.id);
    setSelectedIds(new Set(enabledModels.map((model) => model.id)));
    setMessages({});
    setMaximizedId(null);
    setDrawerOpen(false);
    refreshSessions();
  }, [models, refreshSessions]);

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    loadSession(id);
    setDrawerOpen(false);
  }, [loadSession]);

  const handleDeleteSession = useCallback(async (id: string) => {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages({});
      setMaximizedId(null);
    }
    refreshSessions();
  }, [activeSessionId, refreshSessions]);

  const handleRenameSession = useCallback(async (id: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    });
    if (!res.ok) return;
    setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, title: nextTitle } : session)));
    refreshSessions();
  }, [refreshSessions]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMaximizedId((prev) => (prev === id ? null : prev));
  }, []);

  useEffect(() => {
    if (!activeSessionId || selectedIds.size === 0) return;
    const timer = setTimeout(() => {
      fetch(`/api/sessions/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelIds: Array.from(selectedIds) }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [activeSessionId, selectedIds]);

  const appendAssistantContent = useCallback((modelId: string, msgId: string, content: string) => {
    setMessages((prev) => {
      const next = { ...prev };
      const msgs = [...(next[modelId] || [])];
      const idx = msgs.findIndex((msg) => msg.id === msgId);
      if (idx !== -1) msgs[idx] = { ...msgs[idx], content: msgs[idx].content + content };
      next[modelId] = msgs;
      return next;
    });
  }, []);

  const sendToModels = useCallback(async (text: string, targetIds: string[]) => {
    if (!text.trim() || targetIds.length === 0 || !activeSessionId) return;
    setIsStreaming(true);

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSessionId, role: "user", content: text }),
    });

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        next[id] = [...(next[id] || []), userMsg];
      });
      return next;
    });

    const assistantIds: Record<string, string> = {};
    targetIds.forEach((id) => {
      assistantIds[id] = `a-${id}-${Date.now()}`;
    });
    setMessages((prev) => {
      const next = { ...prev };
      targetIds.forEach((id) => {
        next[id] = [...(next[id] || []), { id: assistantIds[id], role: "assistant", content: "", modelId: id, isStreaming: true }];
      });
      return next;
    });

    try {
      const historyForApi: Record<string, { role: "user" | "assistant"; content: string }[]> = {};
      targetIds.forEach((id) => {
        historyForApi[id] = (messages[id] || [])
          .filter((msg) => !msg.isStreaming && !msg.error)
          .map((msg) => ({ role: msg.role, content: msg.content }));
      });

      abortRef.current = new AbortController();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, modelIds: targetIds, history: historyForApi, enableSearch }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error("Chat request failed");

      const reader = res.body.getReader();
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
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(trimmed.slice(6)) as SSEEvent;
            const msgId = assistantIds[event.modelId];
            if (!msgId) continue;

            if (event.type === "search_status") {
              const statusText = event.status === "searching"
                ? `\n\n> 正在搜索: **${event.query}**...\n`
                : event.status === "done"
                  ? `> 找到 ${event.resultCount} 条结果\n\n`
                  : `> 搜索失败: ${event.error}\n\n`;
              appendAssistantContent(event.modelId, msgId, statusText);
            } else if (event.type === "chunk") {
              appendAssistantContent(event.modelId, msgId, event.content);
            } else if (event.type === "done") {
              setMessages((prev) => {
                const next = { ...prev };
                const msgs = [...(next[event.modelId] || [])];
                const idx = msgs.findIndex((msg) => msg.id === msgId);
                if (idx !== -1) msgs[idx] = { ...msgs[idx], isStreaming: false, latencyMs: event.latencyMs };
                next[event.modelId] = msgs;
                return next;
              });
              setMessages((curr) => {
                const msg = curr[event.modelId]?.find((item) => item.id === msgId);
                if (msg) {
                  fetch("/api/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sessionId: activeSessionId,
                      modelId: event.modelId,
                      role: "assistant",
                      content: msg.content,
                      latencyMs: event.latencyMs,
                    }),
                  }).catch(() => {});
                }
                return curr;
              });
            } else if (event.type === "error") {
              setMessages((prev) => {
                const next = { ...prev };
                const msgs = [...(next[event.modelId] || [])];
                const idx = msgs.findIndex((msg) => msg.id === msgId);
                if (idx !== -1) msgs[idx] = { ...msgs[idx], isStreaming: false, error: event.error };
                next[event.modelId] = msgs;
                return next;
              });
              fetch("/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: activeSessionId, modelId: event.modelId, role: "assistant", content: "", error: event.error }),
              }).catch(() => {});
            }
          } catch {
            // 流式事件可能被拆包或混入空行，解析失败时跳过当前行。
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") console.error("Mobile chat error:", err);
    } finally {
      setMessages((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => {
          next[id] = (next[id] || []).map((msg) => (msg.id === assistantIds[id] ? { ...msg, isStreaming: false } : msg));
        });
        return next;
      });
      setIsStreaming(false);
      refreshSessions();
    }
  }, [activeSessionId, appendAssistantContent, enableSearch, messages, refreshSessions]);

  const handleGlobalSend = useCallback(() => {
    const text = input.trim();
    if (!text || selectedIds.size === 0) return;
    setInput("");
    sendToModels(text, Array.from(selectedIds));
  }, [input, selectedIds, sendToModels]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/m/login");
  };

  const selectedModels = models.filter((model) => model.enabled && selectedIds.has(model.id));
  const maximizedModel = maximizedId ? selectedModels.find((model) => model.id === maximizedId) || null : null;
  const restModels = maximizedModel ? selectedModels.filter((model) => model.id !== maximizedModel.id) : selectedModels;
  const activeSession = sessions.find((session) => session.id === activeSessionId);

  if (loading) {
    return (
      <MobileShell title="对话" user={user} onLogout={handleLogout}>
        <div className="flex h-[60dvh] items-center justify-center text-sm text-slate-400">加载中...</div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="对话"
      subtitle={activeSession?.title || "移动端多模型对比"}
      user={user}
      onLogout={handleLogout}
      right={
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600"
          aria-label="打开会话列表"
        >
          <MessageCircle className="h-4 w-4" />
        </button>
      }
      contentClassName="pb-36"
    >
      {!activeSessionId ? (
        <div className="flex min-h-[56dvh] flex-col items-center justify-center text-center">
          <div className="mb-3 text-5xl">🏟️</div>
          <h2 className="text-xl font-bold text-slate-900">Multi-LLM Arena</h2>
          <p className="mt-2 text-sm text-slate-500">新建会话后开始移动端多模型对比</p>
          <button
            type="button"
            onClick={handleCreateSession}
            className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
          >
            新建会话
          </button>
        </div>
      ) : selectedModels.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-400">请选择至少一个模型</div>
      ) : (
        <div className="space-y-4 pt-4">
          {maximizedModel && (
            <MobileChatPanel
              key={maximizedModel.id}
              model={maximizedModel}
              messages={messages[maximizedModel.id] || []}
              selected
              isMaximized
              searchEnabled={enableSearch}
              isGlobalStreaming={isStreaming}
              onToggleSelect={() => toggleSelect(maximizedModel.id)}
              onToggleMaximize={() => setMaximizedId(null)}
              onSendSolo={(text) => sendToModels(text, [maximizedModel.id])}
            />
          )}
          {restModels.map((model) => (
            <MobileChatPanel
              key={model.id}
              model={model}
              messages={messages[model.id] || []}
              selected
              isMaximized={false}
              searchEnabled={enableSearch}
              isGlobalStreaming={isStreaming}
              onToggleSelect={() => toggleSelect(model.id)}
              onToggleMaximize={() => setMaximizedId(model.id)}
              onSendSolo={(text) => sendToModels(text, [model.id])}
            />
          ))}
        </div>
      )}

      <MobileSessionDrawer
        open={drawerOpen}
        sessions={sessions}
        activeId={activeSessionId}
        onClose={() => setDrawerOpen(false)}
        onCreate={handleCreateSession}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
        onRename={handleRenameSession}
      />
      <MobileSheet open={modelSheetOpen} title="选择模型" onClose={() => setModelSheetOpen(false)}>
        <div className="space-y-2">
          {models.filter((model) => model.enabled).map((model) => {
            const active = selectedIds.has(model.id);
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => toggleSelect(model.id)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                  active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="text-xl">{model.icon}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{model.name}</span>
                    <span className="block truncate text-xs text-slate-400">{model.modelId}</span>
                  </span>
                </span>
                <span className={`h-5 w-5 rounded-full border-2 ${active ? "border-blue-600 bg-blue-600" : "border-slate-300"}`} />
              </button>
            );
          })}
        </div>
      </MobileSheet>
      <MobileComposer
        value={input}
        selectedCount={selectedIds.size}
        isStreaming={isStreaming}
        enableSearch={enableSearch}
        onChange={setInput}
        onOpenModels={() => setModelSheetOpen(true)}
        onSend={handleGlobalSend}
        onToggleSearch={() => setEnableSearch((prev) => !prev)}
        onStop={() => abortRef.current?.abort()}
      />
    </MobileShell>
  );
}
