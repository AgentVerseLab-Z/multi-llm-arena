"use client";

import type { ReactNode } from "react";
import MobileHeader from "./MobileHeader";

/**
 * 文件说明：移动端页面骨架组件。
 * 作者：Codex
 * 用途：统一移动端顶部栏、底部导航和内容安全区。
 */

interface MobileShellProps {
  title: string;
  subtitle?: string;
  user?: { username: string; role: string } | null;
  right?: ReactNode;
  children: ReactNode;
  onLogout?: () => void;
  withBottomNav?: boolean;
  contentClassName?: string;
}

/**
 * 功能：渲染移动端页面基础布局。
 * 入参：标题、用户、内容、退出回调、是否展示底部导航等。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<MobileShell title="模型配置" user={user}>...</MobileShell>。
 */
export default function MobileShell({
  title,
  subtitle,
  user,
  right,
  children,
  onLogout,
  withBottomNav = false,
  contentClassName = "",
}: MobileShellProps) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 lg:hidden">
      <MobileHeader title={title} subtitle={subtitle} user={user} right={right} onLogout={onLogout} />
      <main className={`px-4 py-4 ${withBottomNav ? "pb-20" : "pb-6"} ${contentClassName}`}>
        {children}
      </main>
    </div>
  );
}
