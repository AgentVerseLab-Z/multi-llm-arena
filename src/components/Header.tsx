"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  user?: { username: string; role: string } | null;
  onLogout?: () => void;
}

const tabs = [
  { href: "/", label: "💬 对话", shortLabel: "💬", roles: ["user", "admin", "super_admin"] },
  { href: "/settings", label: "⚙️ 模型配置", shortLabel: "⚙️", roles: ["admin", "super_admin"] },
  { href: "/admin/users", label: "👥 用户管理", shortLabel: "👥", roles: ["super_admin"] },
  { href: "/password", label: "🔑 改密", shortLabel: "🔑", roles: ["user", "admin", "super_admin"] },
];

export default function Header({ user, onLogout }: Props) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            🏟️ <span className="hidden sm:inline">Multi-LLM Arena</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex gap-0.5 sm:gap-1">
            {tabs
              .filter((t) => user && t.roles.includes(user.role))
              .map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    pathname === tab.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </Link>
              ))}
          </nav>

          {user && (
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold">
                  {user.username[0].toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-slate-700 leading-tight">{user.username}</div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    {user.role === "super_admin" ? "超级管理员" : user.role === "admin" ? "管理员" : "普通用户"}
                  </div>
                </div>
              </div>
              <button onClick={onLogout}
                className="text-[10px] sm:text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5 sm:px-2 py-0.5 sm:py-1 rounded hover:bg-red-50">
                退出
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
