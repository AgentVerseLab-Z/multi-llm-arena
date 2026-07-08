"use client";

import type { ReactNode } from "react";

/**
 * 文件说明：移动端通用底部弹层组件。
 * 作者：Codex
 * 用途：承载会话列表、模型选择、表单操作等移动端弹层。
 */

interface MobileSheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

/**
 * 功能：渲染移动端底部弹层。
 * 入参：open 控制显示；title 标题；children 内容；onClose 关闭回调。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<MobileSheet open={open} title="选择模型" onClose={close}>...</MobileSheet>。
 */
export default function MobileSheet({ open, title, children, onClose }: MobileSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="关闭弹层"
        className="absolute inset-0 bg-slate-950/45"
        onClick={onClose}
      />
      <section className="absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-hidden rounded-t-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-slate-500 active:bg-slate-100"
          >
            关闭
          </button>
        </div>
        <div className="max-h-[calc(86dvh-52px)] overflow-y-auto p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </section>
    </div>
  );
}
