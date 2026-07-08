"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 文件说明：移动端登录页面。
 * 作者：Codex
 * 用途：为手机访问提供独立登录 UI，复用现有登录和验证码 API。
 */

/**
 * 功能：渲染移动端登录页。
 * 入参：无。
 * 出参：React 页面节点。
 * 异常：网络或认证错误以页面提示展示。
 * 示例：访问 /m/login。
 */
export default function MobileLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCaptcha = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/captcha", { cache: "no-store" });
      const svg = await res.text();
      setCaptchaSvg(svg);
      setCaptchaToken(res.headers.get("X-Captcha-Token") || "");
      setCaptchaInput("");
    } catch {
      setError("验证码加载失败");
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, captcha: captchaInput, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登录失败");
        loadCaptcha();
        return;
      }
      router.push("/m");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh bg-slate-950 px-4 py-[calc(24px+env(safe-area-inset-top))] text-slate-900 lg:hidden">
      <div className="m-auto w-full max-w-md">
        <div className="mb-7 text-center text-white">
          <div className="mb-3 text-5xl">🏟️</div>
          <h1 className="text-2xl font-bold">Multi-LLM Arena</h1>
          <p className="mt-1 text-sm text-slate-300">移动端多模型对话</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-3xl bg-white p-5 shadow-2xl">
          <h2 className="mb-5 text-xl font-bold text-slate-900">登录</h2>
          {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">用户名</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="请输入用户名"
                autoComplete="username"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="请输入密码"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">验证码</span>
              <input
                value={captchaInput}
                onChange={(event) => setCaptchaInput(event.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5))}
                className="mb-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-center font-mono text-lg tracking-[0.25em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="输入验证码"
                maxLength={5}
                required
              />
              <button
                type="button"
                onClick={loadCaptcha}
                className="flex w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                {captchaSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: captchaSvg }} className="h-[50px] w-[160px]" />
                ) : (
                  <div className="flex h-[50px] items-center text-xs text-slate-400">加载中...</div>
                )}
              </button>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </main>
  );
}
