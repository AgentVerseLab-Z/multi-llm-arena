"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadCaptcha = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/captcha", { cache: "no-store" });
      const svg = await res.text();
      const token = res.headers.get("X-Captcha-Token") || "";
      setCaptchaSvg(svg);
      setCaptchaToken(token);
      setCaptchaInput("");
    } catch {
      console.error("Failed to load captcha");
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏟️</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Multi-LLM Arena
          </h1>
          <p className="text-slate-500 mt-2 text-sm">多模型对话对比平台</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">登录</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                placeholder="请输入用户名"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                placeholder="请输入密码"
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">验证码</label>
              <div className="flex gap-2 sm:gap-3 items-center">
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 5))}
                  className="flex-1 min-w-0 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 text-center tracking-[0.25em] font-mono text-lg"
                  placeholder="输入验证码"
                  inputMode="text"
                  maxLength={5}
                  required
                />
                <button
                  type="button"
                  onClick={loadCaptcha}
                  className="shrink-0 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 active:scale-95 transition-all cursor-pointer"
                  title="刷新验证码"
                >
                  {captchaSvg ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: captchaSvg }}
                      className="w-[155px] h-[44px] sm:w-[160px] sm:h-[50px]"
                    />
                  ) : (
                    <div className="w-[155px] h-[44px] sm:w-[160px] sm:h-[50px] bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      加载中...
                    </div>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">不区分大小写，点击图片刷新</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}
