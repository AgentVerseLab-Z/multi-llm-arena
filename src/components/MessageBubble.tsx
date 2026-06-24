"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  error?: string;
  latencyMs?: number;
  color?: string;
}

export default function MessageBubble({ role, content, isStreaming, error, latencyMs, color }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[95%] w-full">
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm">
            ❌ {error}
          </div>
        ) : (
          <div
            className="bg-slate-50 border border-slate-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm"
            style={{ borderLeftColor: color, borderLeftWidth: color ? 3 : undefined }}
          >
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || " "}</ReactMarkdown>
            </div>
            {isStreaming && (
              <span className="inline-block ml-1 text-slate-400">
                <span style={{ animation: "blink 1.4s infinite 0s" }}>●</span>
                <span style={{ animation: "blink 1.4s infinite 0.2s" }}>●</span>
                <span style={{ animation: "blink 1.4s infinite 0.4s" }}>●</span>
              </span>
            )}
          </div>
        )}
        {!isStreaming && latencyMs !== undefined && (
          <div className="text-[11px] text-slate-400 mt-1 ml-2">
            ⏱ {(latencyMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
}
