"use client";

import { useState } from "react";

interface Session {
  id: string;
  title: string;
  modelIds: string[];
  messageCount: number;
  updatedAt: string;
}

interface Props {
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  user: { username: string; role: string } | null;
  onLogout: () => void;
}

export default function Sidebar({ sessions, activeId, onSelect, onCreate, onDelete, user, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setMobileOpen(false); // close mobile sidebar on select
  };

  const handleCreate = () => {
    onCreate();
    setMobileOpen(false);
  };

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">💬 会话列表</span>
        {/* Desktop collapse / Mobile close */}
        <button
          onClick={() => {
            setCollapsed(true);
            setMobileOpen(false);
          }}
          className="text-slate-400 hover:text-slate-600 text-sm hidden lg:block"
          title="收起"
        >
          ◀
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-slate-400 hover:text-slate-600 text-lg lg:hidden"
        >
          ✕
        </button>
      </div>

      {/* New session button */}
      <div className="p-3">
        <button
          onClick={handleCreate}
          className="w-full px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          ✚ 新建会话
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {sessions.length === 0 && (
          <div className="text-center text-slate-400 text-xs py-8">暂无会话</div>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              activeId === s.id ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {s.messageCount} 条消息 · {new Date(s.updatedAt).toLocaleDateString("zh-CN")}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(s.id);
              }}
              className={`text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded ${
                confirmDelete === s.id ? "bg-red-100 text-red-600" : "text-slate-400 hover:text-red-500"
              }`}
              title={confirmDelete === s.id ? "确认删除" : "删除"}
            >
              {confirmDelete === s.id ? "确认" : "✕"}
            </button>
          </div>
        ))}
      </div>

      {/* User info */}
      {user && (
        <div className="p-3 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate">{user.username}</div>
              <div className="text-[11px] text-slate-400">{user.role === "admin" ? "管理员" : "用户"}</div>
            </div>
          </div>
          <button onClick={onLogout} className="text-xs text-slate-400 hover:text-red-500 shrink-0" title="退出登录">
            退出
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* ===== Desktop sidebar ===== */}
      {collapsed ? (
        <div className="hidden lg:flex w-12 bg-slate-50 border-r border-slate-200 flex-col items-center py-4 gap-3 shrink-0">
          <button onClick={() => setCollapsed(false)} className="text-slate-400 hover:text-slate-600 text-lg" title="展开">
            ☰
          </button>
          <button onClick={onCreate} className="text-blue-600 hover:text-blue-700 text-lg" title="新会话">
            ✚
          </button>
        </div>
      ) : (
        <div className="hidden lg:flex w-64 bg-slate-50 border-r border-slate-200 flex-col shrink-0 h-full">
          {sidebarContent}
        </div>
      )}

      {/* ===== Mobile hamburger button ===== */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-20 left-4 z-40 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-lg hover:bg-blue-700 transition-colors"
      >
        ☰
      </button>

      {/* ===== Mobile sidebar overlay ===== */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-in panel */}
          <div className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-slate-50 z-50 flex flex-col shadow-2xl animate-slide-in">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
