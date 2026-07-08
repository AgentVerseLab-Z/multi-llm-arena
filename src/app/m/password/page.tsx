"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileShell from "@/components/mobile/MobileShell";

/**
 * 文件说明：移动端修改密码页面。
 * 作者：Codex
 * 用途：提供手机端单列表单，复用现有改密 API。
 */

/**
 * 功能：渲染移动端修改密码页。
 * 入参：无。
 * 出参：React 页面节点。
 * 异常：认证失败跳转登录；接口错误展示提示。
 * 示例：访问 /m/password。
 */
export default function MobilePasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then(setUser)
      .catch(() => router.push("/m/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/m/login");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMsg(null);

    if (!currentPw || !newPw || !confirmPw) {
      setMsg({ type: "err", text: "请填写所有字段" });
      return;
    }
    if (newPw.length < 6) {
      setMsg({ type: "err", text: "新密码至少6位" });
      return;
    }
    if (newPw !== confirmPw) {
      setMsg({ type: "err", text: "两次输入的新密码不一致" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data.error || "修改失败" });
        return;
      }
      setMsg({ type: "ok", text: "密码修改成功" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch {
      setMsg({ type: "err", text: "网络错误，请稍后重试" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileShell title="修改密码" user={user} onLogout={handleLogout}>
      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {msg && (
          <div className={`mb-4 rounded-2xl px-3 py-2 text-sm ${
            msg.type === "ok" ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-700"
          }`}>
            {msg.text}
          </div>
        )}
        <div className="space-y-4">
          <PasswordField label="当前密码" value={currentPw} onChange={setCurrentPw} placeholder="输入当前密码" />
          <PasswordField label="新密码" value={newPw} onChange={setNewPw} placeholder="至少6位" />
          <PasswordField label="确认新密码" value={confirmPw} onChange={setConfirmPw} placeholder="再次输入新密码" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "修改中..." : "确认修改"}
        </button>
      </form>
    </MobileShell>
  );
}

/**
 * 功能：渲染密码输入字段。
 * 入参：label 标签；value 值；onChange 更新回调；placeholder 占位文案。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<PasswordField label="新密码" value={value} onChange={setValue} />。
 */
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        placeholder={placeholder}
      />
    </label>
  );
}
