"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 文件说明：移动端消息气泡组件。
 * 作者：Codex
 * 用途：在移动端渲染用户消息、模型回答、错误和流式状态。
 */

interface MobileMessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  error?: string;
  latencyMs?: number;
  color?: string;
}

/**
 * 功能：渲染移动端消息气泡。
 * 入参：role 角色；content 内容；isStreaming 流式状态；error 错误；latencyMs 耗时；color 模型色。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<MobileMessageBubble role="assistant" content="你好" />。
 */
export default function MobileMessageBubble({
  role,
  content,
  isStreaming,
  error,
  latencyMs,
  color,
}: MobileMessageBubbleProps) {
  if (role === "user") {
    return (
      <div className="mb-3 flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-blue-600 px-3.5 py-2.5 text-sm leading-6 text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      {error ? (
        <div className="rounded-2xl rounded-bl-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <div
          className="mobile-markdown rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-3.5 py-3 text-sm"
          style={{ borderLeftColor: color, borderLeftWidth: color ? 3 : undefined }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || " "}</ReactMarkdown>
          {isStreaming && <span className="ml-1 text-slate-400">正在生成...</span>}
        </div>
      )}
      {!isStreaming && latencyMs !== undefined && (
        <div className="ml-2 mt-1 text-[11px] text-slate-400">{(latencyMs / 1000).toFixed(1)}s</div>
      )}
    </div>
  );
}
