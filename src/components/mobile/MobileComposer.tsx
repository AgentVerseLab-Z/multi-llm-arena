"use client";

import { Bot, Globe2, Send, Square } from "lucide-react";

/**
 * 文件说明：移动端底部消息输入组件。
 * 作者：Codex
 * 用途：提供全局多模型发送、联网搜索开关和停止生成入口。
 */

interface MobileComposerProps {
  value: string;
  selectedCount: number;
  isStreaming: boolean;
  enableSearch: boolean;
  onChange: (value: string) => void;
  onOpenModels: () => void;
  onSend: () => void;
  onToggleSearch: () => void;
  onStop: () => void;
}

/**
 * 功能：渲染移动端固定输入栏。
 * 入参：输入值、选中模型数、流式状态、搜索状态、模型选择入口和事件回调。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<MobileComposer value={input} onSend={send} />。
 */
export default function MobileComposer({
  value,
  selectedCount,
  isStreaming,
  enableSearch,
  onChange,
  onOpenModels,
  onSend,
  onToggleSearch,
  onStop,
}: MobileComposerProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="mx-auto max-w-md">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={onOpenModels}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-600"
            aria-label="选择模型"
          >
            <Bot className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToggleSearch}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
              enableSearch ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400"
            }`}
            aria-label={enableSearch ? "关闭联网搜索" : "开启联网搜索"}
          >
            <Globe2 className="h-5 w-5" />
          </button>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            rows={1}
            disabled={isStreaming}
            placeholder="输入消息..."
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white"
              aria-label="停止生成"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!value.trim() || selectedCount === 0}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white disabled:opacity-40"
              aria-label="发送消息"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>发送到 {selectedCount} 个模型</span>
          {enableSearch && <span className="text-blue-600">搜索已开启</span>}
        </div>
      </div>
    </div>
  );
}
