"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Maximize2, Minimize2, Send, Wifi } from "lucide-react";
import type { Message, ModelPublic } from "@/lib/types";
import MobileMessageBubble from "./MobileMessageBubble";

/**
 * 文件说明：移动端模型对话卡片组件。
 * 作者：Codex
 * 用途：以纵向卡片流展示单个模型的消息列表和单独提问入口。
 */

interface MobileChatPanelProps {
  model: ModelPublic;
  messages: Message[];
  selected: boolean;
  isMaximized: boolean;
  searchEnabled: boolean;
  isGlobalStreaming: boolean;
  onToggleSelect: () => void;
  onToggleMaximize: () => void;
  onSendSolo: (message: string) => void;
}

/**
 * 功能：渲染单个模型的移动端对话卡片。
 * 入参：model 模型；messages 消息；selected 是否选中；isMaximized 是否最大化；searchEnabled 搜索状态；isGlobalStreaming 全局流式状态；onToggleSelect 选中切换回调；onToggleMaximize 最大化切换回调；onSendSolo 单独发送回调。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<MobileChatPanel model={model} messages={messages} selected isMaximized={false} onToggleSelect={toggle} onToggleMaximize={maximize} onSendSolo={send} />。
 */
export default function MobileChatPanel({
  model,
  messages,
  selected,
  isMaximized,
  searchEnabled,
  isGlobalStreaming,
  onToggleSelect,
  onToggleMaximize,
  onSendSolo,
}: MobileChatPanelProps) {
  const [soloInput, setSoloInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = messages.some((msg) => msg.isStreaming);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = soloInput.trim();
    if (!text) return;
    onSendSolo(text);
    setSoloInput("");
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-t-4 px-4 py-3" style={{ borderTopColor: model.color }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">{model.icon}</span>
              <h2 className="truncate text-base font-semibold text-slate-900">{model.name}1</h2>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">{model.modelId}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {searchEnabled && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
                model.supportsSearch ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400"
              }`}>
                <Wifi className="h-3 w-3" />
                {model.supportsSearch ? "可搜索" : "不支持"}
              </span>
            )}
            <button
              type="button"
              onClick={onToggleMaximize}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
              aria-label={isMaximized ? "还原模型块" : "最大化模型块"}
              title={isMaximized ? "还原" : "最大化"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onToggleSelect}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-400 hover:bg-slate-50"
              }`}
              aria-label={selected ? "取消选中模型" : "选中模型"}
              title={selected ? "取消选中" : "选中"}
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className={`overflow-y-auto px-4 py-3 ${isMaximized ? "max-h-[68dvh] min-h-[52dvh]" : "max-h-[58dvh] min-h-40"}`}>
        {messages.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center text-sm text-slate-300">等待对话开始</div>
        ) : (
          messages.map((msg) => (
            <MobileMessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              isStreaming={msg.isStreaming}
              error={msg.error}
              latencyMs={msg.latencyMs}
              color={model.color}
            />
          ))
        )}
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-2">
          <input
            value={soloInput}
            onChange={(event) => setSoloInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSend();
            }}
            disabled={isStreaming || isGlobalStreaming}
            placeholder={`单独问 ${model.name}`}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isStreaming || isGlobalStreaming || !soloInput.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-40"
            aria-label="单独发送"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
