"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";
import ModelSelector from "@/components/ModelSelector";
import type { ModelPublic, Message, SSEEvent } from "@/lib/types";

interface SessionInfo {
  id: string;
  title: string;
  modelIds: string[];
  messageCount: number;
  updatedAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string; userId: string } | null>(null);
  const [models, setModels] = useState<ModelPublic[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [maximizedId, setMaximizedId] = useState<string | null>(null);
  const [enableSearch, setEnableSearch] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Check auth
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((data) => setUser(data))
      .catch(() => router.push("/login"));
  }, [router]);

  // Load models
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then(setModels)
      .finally(() => setLoading(false));
  }, []);

  // Load sessions
  const refreshSessions = useCallback(() => {
    fetch("/api/sessions").then((r) => r.json()).then(setSessions);
  }, []);

  useEffect(() => {
    if (user) refreshSessions();
  }, [user, refreshSessions]);

  // Load session messages when active session changes
  const loadSession = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) return;
    const data = await res.json();

    // Parse messages into per-model buckets
    const buckets: Record<string, Message[]> = {};
    for (const msg of data.messages) {
      const key = msg.modelId || "user";
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        modelId: msg.modelId || undefined,
        latencyMs: msg.latencyMs || undefined,
        error: msg.error || undefined,
      });
    }

    // Interleave: for each model, arrange user+assistant pairs
    const modelIds: string[] = Array.from(new Set(data.messages.filter((m: { modelId: string | null }) => m.modelId).map((m: { modelId: string }) => m.modelId))) as string[];
    const result: Record<string, Message[]> = {};
    // Collect all user messages
    const userMsgs = data.messages.filter((m: { role: string }) => m.role === "user");
    for (const mid of modelIds) {
      result[mid] = [];
      const modelMsgs = data.messages.filter((m: { modelId: string | null }) => m.modelId === mid);
      // Interleave user messages with model responses
      let ui = 0, mi = 0;
      while (ui < userMsgs.length || mi < modelMsgs.length) {
        if (ui < userMsgs.length && (mi >= modelMsgs.length || new Date(userMsgs[ui].createdAt) <= new Date(modelMsgs[mi].createdAt))) {
          result[mid].push({
            id: userMsgs[ui].id + "-" + mid,
            role: "user",
            content: userMsgs[ui].content,
          });
          ui++;
        } else if (mi < modelMsgs.length) {
          result[mid].push({
            id: modelMsgs[mi].id,
            role: "assistant",
            content: modelMsgs[mi].content,
            modelId: mid,
            latencyMs: modelMsgs[mi].latencyMs || undefined,
            error: modelMsgs[mi].error || undefined,
          });
          mi++;
        }
      }
    }

    setMessages(result);
    setSelectedIds(new Set(data.modelIds));
  }, []);

  // Create new session
  const handleCreateSession = useCallback(async () => {
    const enabledModels = models.filter((m) => m.enabled);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "新会话",
        modelIds: enabledModels.map((m) => m.id),
      }),
    });
    const session = await res.json();
    setActiveSessionId(session.id);
    setSelectedIds(new Set(enabledModels.map((m) => m.id)));
    setMessages({});
    refreshSessions();
  }, [models, refreshSessions]);

  // Delete session
  const handleDeleteSession = useCallback(
    async (id: string) => {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages({});
      }
      refreshSessions();
    },
    [activeSessionId, refreshSessions]
  );

  // Select session
  const handleSelectSession = useCallback(
    (id: string) => {
      setActiveSessionId(id);
      loadSession(id);
    },
    [loadSession]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Persist selected model IDs to session when they change
  useEffect(() => {
    if (!activeSessionId || selectedIds.size === 0) return;
    // Debounced save
    const timer = setTimeout(() => {
      fetch(`/api/sessions/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelIds: Array.from(selectedIds) }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [activeSessionId, selectedIds]);

  /** Send message via SSE */
  const sendToModels = useCallback(
    async (text: string, targetIds: string[]) => {
      if (!text.trim() || targetIds.length === 0 || !activeSessionId) return;
      setIsStreaming(true);

      // Save user message to DB
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSessionId, role: "user", content: text }),
      });

      // Add user message to UI
      const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
      setMessages((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => {
          next[id] = [...(next[id] || []), userMsg];
        });
        return next;
      });

      // Create assistant placeholders
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

      // Update session modelIds
      fetch(`/api/sessions/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelIds: selectedIds }),
      }).catch(() => {});

      try {
        // Build history for each model from frontend state
        const historyForApi: Record<string, { role: "user" | "assistant"; content: string }[]> = {};
        targetIds.forEach((id) => {
          historyForApi[id] = (messages[id] || [])
            .filter((m) => !m.isStreaming && !m.error)
            .map((m) => ({ role: m.role, content: m.content }));
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
                // Show search status in the assistant message
                const statusText = event.status === "searching"
                  ? `\n\n> 🔍 正在搜索: **${event.query}**...\n`
                  : event.status === "done"
                  ? `> ✅ 找到 ${event.resultCount} 条结果\n\n`
                  : `> ❌ 搜索失败: ${event.error}\n\n`;
                setMessages((prev) => {
                  const next = { ...prev };
                  const msgs = [...(next[event.modelId] || [])];
                  const idx = msgs.findIndex((m) => m.id === msgId);
                  if (idx !== -1) msgs[idx] = { ...msgs[idx], content: msgs[idx].content + statusText };
                  next[event.modelId] = msgs;
                  return next;
                });
              } else if (event.type === "chunk") {
                setMessages((prev) => {
                  const next = { ...prev };
                  const msgs = [...(next[event.modelId] || [])];
                  const idx = msgs.findIndex((m) => m.id === msgId);
                  if (idx !== -1) msgs[idx] = { ...msgs[idx], content: msgs[idx].content + event.content };
                  next[event.modelId] = msgs;
                  return next;
                });
              } else if (event.type === "done") {
                setMessages((prev) => {
                  const next = { ...prev };
                  const msgs = [...(next[event.modelId] || [])];
                  const idx = msgs.findIndex((m) => m.id === msgId);
                  if (idx !== -1) msgs[idx] = { ...msgs[idx], isStreaming: false, latencyMs: event.latencyMs };
                  next[event.modelId] = msgs;
                  return next;
                });
                // Save to DB
                setMessages((curr) => {
                  const msg = curr[event.modelId]?.find((m) => m.id === msgId);
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
                  const idx = msgs.findIndex((m) => m.id === msgId);
                  if (idx !== -1) msgs[idx] = { ...msgs[idx], isStreaming: false, error: event.error };
                  next[event.modelId] = msgs;
                  return next;
                });
                // Save error to DB
                fetch("/api/messages", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionId: activeSessionId, modelId: event.modelId, role: "assistant", content: "", error: event.error }),
                }).catch(() => {});
              }
            } catch { /* skip */ }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") console.error("Chat error:", err);
      } finally {
        setMessages((prev) => {
          const next = { ...prev };
          targetIds.forEach((id) => {
            next[id] = (next[id] || []).map((m) => (m.id === assistantIds[id] ? { ...m, isStreaming: false } : m));
          });
          return next;
        });
        setIsStreaming(false);
        refreshSessions();
      }
    },
    [activeSessionId, selectedIds, messages, refreshSessions, enableSearch]
  );

  const handleGlobalSend = useCallback(() => {
    const text = input.trim();
    if (!text || selectedIds.size === 0) return;
    setInput("");
    sendToModels(text, Array.from(selectedIds));
  }, [input, selectedIds, sendToModels]);

  const handleSoloSend = useCallback(
    (modelId: string, text: string) => {
      sendToModels(text, [modelId]);
    },
    [sendToModels]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }, [router]);

  const selectedCount = selectedIds.size;
  const enabledModels = models.filter((m) => m.enabled);

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center h-[calc(100dvh-56px)] text-slate-400">加载中...</div>
      </>
    );
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} />
      <div className="flex h-[calc(100dvh-56px)] overflow-hidden" style={{ overscrollBehavior: 'contain' }}>
        {/* Sidebar */}
        <Sidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={handleSelectSession}
          onCreate={handleCreateSession}
          onDelete={handleDeleteSession}
          user={user}
          onLogout={handleLogout}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeSessionId ? (
            /* Welcome */
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
              <div className="text-6xl">🏟️</div>
              <div className="text-xl font-medium text-slate-600">Multi-LLM Arena</div>
              <div className="text-sm">点击左侧「新建会话」开始对话</div>
              <button
                onClick={handleCreateSession}
                className="mt-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
              >
                ✚ 新建会话
              </button>
            </div>
          ) : (
            <>
              {/* Model selector bar */}
              <div className="shrink-0 px-4 py-3 border-b border-slate-100 bg-white shadow-sm">
                <ModelSelector models={models} selectedIds={selectedIds} onToggle={toggleSelect} />
              </div>

              {/* Chat panels */}
              <div className="flex-1 overflow-auto p-4" style={{ overscrollBehavior: 'contain' }}>
                {(() => {
                  const selected = enabledModels.filter((m) => selectedIds.has(m.id));
                  const maximized = maximizedId ? selected.find((m) => m.id === maximizedId) : null;
                  const rest = maximized ? selected.filter((m) => m.id !== maximizedId) : selected;

                  return (
                    <div className="flex flex-col gap-4">
                      {/* Maximized panel first */}
                      {maximized && (
                        <ChatPanel
                          key={maximized.id}
                          model={maximized}
                          messages={messages[maximized.id] || []}
                          selected={true}
                          isMaximized={true}
                          onToggleSelect={() => toggleSelect(maximized.id)}
                          onToggleMaximize={() => setMaximizedId(null)}
                          onSendSolo={(text) => handleSoloSend(maximized.id, text)}
                          isGlobalStreaming={isStreaming}
                          searchEnabled={enableSearch}
                        />
                      )}
                      {/* Remaining panels in grid */}
                      {rest.length > 0 && (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {rest.map((model) => (
                            <ChatPanel
                              key={model.id}
                              model={model}
                              messages={messages[model.id] || []}
                              selected={true}
                              isMaximized={false}
                              onToggleSelect={() => toggleSelect(model.id)}
                              onToggleMaximize={() => setMaximizedId(model.id)}
                              onSendSolo={(text) => handleSoloSend(model.id, text)}
                              isGlobalStreaming={isStreaming}
                              searchEnabled={enableSearch}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                {selectedCount === 0 && (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    请在上方选择至少一个模型
                  </div>
                )}
              </div>

              {/* Global input */}
              <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4" style={{ overscrollBehavior: 'contain' }}>
                <div className="flex gap-2 sm:gap-3 items-center max-w-screen-xl mx-auto">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGlobalSend(); }
                    }}
                    placeholder="输入消息..."
                    rows={1}
                    disabled={isStreaming}
                    autoComplete="off"
                    className="flex-1 min-w-0 resize-none text-sm px-3 sm:px-4 py-2 sm:py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 placeholder:text-slate-400 shadow-sm"
                    style={{ minHeight: "40px", maxHeight: "100px" }}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEnableSearch(!enableSearch)}
                      className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-colors ${
                        enableSearch
                          ? "border-blue-300 bg-blue-50 text-blue-600"
                          : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                      }`}
                      title={enableSearch ? "点击关闭联网搜索" : "点击开启联网搜索"}
                    >
                      🌐
                    </button>
                    <button
                      onClick={handleGlobalSend}
                      disabled={isStreaming || !input.trim() || selectedCount === 0}
                      className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">📢 发送 ({selectedCount})</span>
                      <span className="sm:hidden">发送</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 max-w-screen-xl mx-auto">
                  <span>Enter 发送 · Shift+Enter 换行</span>
                  {enableSearch && <span className="text-blue-600">🌐 搜索已开启</span>}
                  {isStreaming && (
                    <button onClick={() => abortRef.current?.abort()} className="text-red-500 hover:text-red-700 font-medium">
                      ⏹ 停止
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
