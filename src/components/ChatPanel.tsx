"use client";

import { useRef, useEffect, useState } from "react";
import type { ModelPublic, Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

interface Props {
  model: ModelPublic;
  messages: Message[];
  selected: boolean;
  isMaximized: boolean;
  onToggleSelect: () => void;
  onToggleMaximize: () => void;
  onSendSolo: (message: string) => void;
  isGlobalStreaming: boolean;
  searchEnabled?: boolean;
}

export default function ChatPanel({ model, messages, selected, isMaximized, onToggleSelect, onToggleMaximize, onSendSolo, isGlobalStreaming, searchEnabled }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [soloInput, setSoloInput] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSoloSend = () => {
    const text = soloInput.trim();
    if (!text) return;
    onSendSolo(text);
    setSoloInput("");
  };

  const isStreaming = messages.some((m) => m.isStreaming);

  return (
    <div className={`flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all ${isMaximized ? "min-h-[60vh]" : ""}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-100"
        style={{ borderTopColor: model.color, borderTopWidth: 3 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{model.icon}</span>
          <div>
            <div className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
              {model.name}
              {searchEnabled && (
                model.supportsSearch ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-normal" title="支持联网搜索">🌐</span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-normal" title="该模型不支持联网搜索">—</span>
                )
              )}
            </div>
            <div className="text-[11px] text-slate-400">{model.modelId}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Maximize button */}
          <button
            onClick={onToggleMaximize}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-colors"
            title={isMaximized ? "还原" : "放大"}
          >
            {isMaximized ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
          {/* Select checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-slate-400">{selected ? "已选" : "未选"}</span>
            <div
              onClick={onToggleSelect}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                selected ? "bg-blue-600 border-blue-600" : "border-slate-300 hover:border-slate-400"
              }`}
            >
              {selected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto p-3 sm:p-4 ${isMaximized ? "min-h-[40vh]" : "min-h-[150px] sm:min-h-[200px] max-h-[350px] sm:max-h-[500px]"}`}>
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-300 text-sm">
            等待对话开始...
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            isStreaming={msg.isStreaming}
            error={msg.error}
            latencyMs={msg.latencyMs}
            color={model.color}
          />
        ))}
      </div>

      {/* Solo input */}
      <div className="border-t border-slate-100 p-3">
        {/* Hidden decoy fields to prevent browser autofill */}
        <input type="text" name="fake-username" autoComplete="username" tabIndex={-1} aria-hidden="true" className="absolute opacity-0 pointer-events-none" style={{ height: 0, width: 0, padding: 0, border: 0 }} />
        <input type="password" name="fake-password" autoComplete="new-password" tabIndex={-1} aria-hidden="true" className="absolute opacity-0 pointer-events-none" style={{ height: 0, width: 0, padding: 0, border: 0 }} />
        <div className="flex gap-2">
          <input
            type="text"
            value={soloInput}
            onChange={(e) => setSoloInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSoloSend()}
            placeholder={`对 ${model.name} 单独提问...`}
            disabled={isStreaming || isGlobalStreaming}
            autoComplete="off"
            name={`chat-${model.id}`}
            className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-300"
          />
          <button
            onClick={handleSoloSend}
            disabled={isStreaming || isGlobalStreaming || !soloInput.trim()}
            className="px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
