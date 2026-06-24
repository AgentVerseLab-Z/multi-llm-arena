"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function PasswordPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setUser)
      .catch(() => router.push("/login"));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!currentPw || !newPw) {
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
    if (newPw === currentPw) {
      setMsg({ type: "err", text: "新密码不能和当前密码相同" });
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
      if (res.ok) {
        setMsg({ type: "ok", text: "密码修改成功！下次登录请使用新密码" });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        setMsg({ type: "err", text: data.error || "修改失败" });
      }
    } catch {
      setMsg({ type: "err", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <>
      <Header user={user} onLogout={handleLogout} />
      <div className="max-w-md mx-auto p-4 sm:p-6 mt-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">🔑 修改密码</h1>
        <p className="text-sm text-slate-500 mb-6">修改当前账号的登录密码</p>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6">
          {msg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {msg.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">当前密码</label>
              <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="输入当前密码" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">新密码</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="至少6位" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">确认新密码</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="再次输入新密码" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full mt-6 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? "修改中..." : "确认修改"}
          </button>
        </form>
      </div>
    </>
  );
}
