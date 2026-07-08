"use client";

import { Check, Edit3, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import MobileSheet from "./MobileSheet";

/**
 * 文件说明：移动端会话列表抽屉组件。
 * 作者：Codex
 * 用途：管理移动端会话新建、切换、改名和删除。
 */

interface SessionInfo {
  id: string;
  title: string;
  modelIds: string[];
  messageCount: number;
  updatedAt: string;
}

interface MobileSessionDrawerProps {
  open: boolean;
  sessions: SessionInfo[];
  activeId: string | null;
  onClose: () => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void> | void;
}

/**
 * 功能：渲染移动端会话抽屉。
 * 入参：open 显示状态；sessions 会话；activeId 当前会话；新建、选择、删除、改名等操作回调。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<MobileSessionDrawer open={open} sessions={sessions} onCreate={create} />。
 */
export default function MobileSessionDrawer({
  open,
  sessions,
  activeId,
  onClose,
  onCreate,
  onSelect,
  onDelete,
  onRename,
}: MobileSessionDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [renaming, setRenaming] = useState(false);

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(id);
    setTimeout(() => setConfirmDelete(null), 3000);
  };

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditingTitle(title);
    setConfirmDelete(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle("");
    setRenaming(false);
  };

  const submitRename = async () => {
    if (!editingId || renaming) return;
    const title = editingTitle.trim();
    if (!title) return;
    setRenaming(true);
    try {
      await onRename(editingId, title);
      cancelRename();
    } finally {
      setRenaming(false);
    }
  };

  return (
    <MobileSheet open={open} title="会话列表" onClose={onClose}>
      <button
        type="button"
        onClick={onCreate}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
      >
        <Plus className="h-4 w-4" />
        新建会话
      </button>
      <div className="space-y-2">
        {sessions.length === 0 && <div className="py-10 text-center text-sm text-slate-400">暂无会话</div>}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`rounded-2xl border p-3 ${
              activeId === session.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            {editingId === session.id ? (
              <div className="space-y-2">
                <input
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRename();
                    if (event.key === "Escape") cancelRename();
                  }}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="输入会话名称"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={submitRename}
                    disabled={renaming || !editingTitle.trim()}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-40"
                  >
                    <Check className="h-3 w-3" />
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500"
                  >
                    <X className="h-3 w-3" />
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => onSelect(session.id)} className="block w-full text-left">
                  <div className="truncate text-sm font-semibold text-slate-900">{session.title}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {session.messageCount} 条消息 · {new Date(session.updatedAt).toLocaleDateString("zh-CN")}
                  </div>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => startRename(session.id, session.title)}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500"
                  >
                    <Edit3 className="h-3 w-3" />
                    修改
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(session.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                      confirmDelete === session.id ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Trash2 className="h-3 w-3" />
                    {confirmDelete === session.id ? "确认删除" : "删除"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </MobileSheet>
  );
}
