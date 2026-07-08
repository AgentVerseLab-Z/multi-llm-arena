"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LogOut, Menu, MessageCircle, Settings, Users } from "lucide-react";

/**
 * 文件说明：移动端顶部栏组件。
 * 作者：Codex
 * 用途：展示当前页面标题、用户信息和退出入口。
 */

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  user?: { username: string; role: string } | null;
  right?: ReactNode;
  onLogout?: () => void;
}

const menuItems = [
  { href: "/m", label: "对话", roles: ["user", "admin", "super_admin"], Icon: MessageCircle },
  { href: "/m/settings", label: "模型配置", roles: ["admin", "super_admin"], Icon: Settings },
  { href: "/m/admin/users", label: "用户管理", roles: ["super_admin"], Icon: Users },
  { href: "/m/password", label: "修改密码", roles: ["user", "admin", "super_admin"], Icon: KeyRound },
];

/**
 * 功能：渲染移动端顶部栏。
 * 入参：title 标题；subtitle 副标题；user 当前用户；right 右侧自定义区域；onLogout 退出回调。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<MobileHeader title="对话" user={user} onLogout={logout} />。
 */
export default function MobileHeader({ title, subtitle, user, right, onLogout }: MobileHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
          <p className="truncate text-xs text-slate-500">
            {subtitle || (user ? `${user.username} · ${user.role}` : "Multi-LLM Arena")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="打开页面菜单"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 active:bg-slate-100"
              >
                <Menu className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="关闭菜单"
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="fixed right-4 top-[calc(56px+env(safe-area-inset-top))] z-50 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl">
                    {visibleItems.map(({ href, label, Icon }) => {
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2.5 text-sm ${
                            active ? "bg-blue-50 text-blue-700" : "text-slate-700 active:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </Link>
                      );
                    })}
                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-sm text-red-600 active:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        退出登录
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {!user && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="退出登录"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 active:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
