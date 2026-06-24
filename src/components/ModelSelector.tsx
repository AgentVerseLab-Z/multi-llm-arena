"use client";

import type { ModelPublic } from "@/lib/types";

interface Props {
  models: ModelPublic[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export default function ModelSelector({ models, selectedIds, onToggle }: Props) {
  const enabled = models.filter((m) => m.enabled);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <span className="text-xs text-slate-500 shrink-0">模型：</span>
      {enabled.map((m) => {
        const active = selectedIds.has(m.id);
        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium border transition-colors shrink-0 ${
              active
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            <span>{m.icon}</span>
            <span className="hidden sm:inline">{m.name}</span>
            <span className="sm:hidden">{m.name.split(" ")[0]}</span>
            {active && (
              <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
