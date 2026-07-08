"use client";

import { SlidersHorizontal } from "lucide-react";
import type { ModelPublic } from "@/lib/types";
import MobileSheet from "./MobileSheet";
import { useState } from "react";

/**
 * 文件说明：移动端模型选择组件。
 * 作者：Codex
 * 用途：通过横向 chips 和底部弹层完成多模型选择。
 */

interface MobileModelSelectorProps {
  models: ModelPublic[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

/**
 * 功能：渲染移动端模型多选入口。
 * 入参：models 模型列表；selectedIds 已选 ID；onToggle 切换回调。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<MobileModelSelector models={models} selectedIds={ids} onToggle={toggle} />。
 */
export default function MobileModelSelector({ models, selectedIds, onToggle }: MobileModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const enabled = models.filter((model) => model.enabled);
  const selected = enabled.filter((model) => selectedIds.has(model.id));

  return (
    <>
      <div className="sticky top-[73px] z-20 -mx-4 border-b border-slate-100 bg-slate-50/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            模型 {selectedIds.size}
          </button>
          {selected.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => onToggle(model.id)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
            >
              <span>{model.icon}</span>
              <span>{model.name}</span>
            </button>
          ))}
          {selected.length === 0 && <span className="text-xs text-slate-400">请选择至少一个模型</span>}
        </div>
      </div>

      <MobileSheet open={open} title="选择模型" onClose={() => setOpen(false)}>
        <div className="space-y-2">
          {enabled.map((model) => {
            const active = selectedIds.has(model.id);
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onToggle(model.id)}
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
    </>
  );
}
