"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import type { ModelPublic } from "@/lib/types";

const COLORS = ["#f97316", "#22c55e", "#a855f7", "#3b82f6", "#ec4899", "#eab308", "#14b8a6", "#ef4444", "#6366f1"];
const ICONS = ["🟠", "🟢", "🟣", "🔵", "🩷", "🟡", "🩵", "🔴", "🟤", "🤖", "🧠", "⚡", "🔥", "💎", "🌟"];

export default function SettingsPage() {
  const router = useRouter();
  const [models, setModels] = useState<ModelPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ModelPublic | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }, [router]);

  // Check auth + admin role
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((data) => {
        setUser(data);
        if (data.role !== "admin" && data.role !== "super_admin") {
          router.push("/");
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then(setModels)
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => fetch("/api/models").then((r) => r.json()).then(setModels);

  const handleSave = async (data: Partial<ModelPublic> & { id: string; apiKeyEnv?: string }) => {
    const method = editing ? "PUT" : "POST";
    const res = await fetch("/api/models", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      refresh();
      setEditing(null);
      setShowAdd(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`确定删除模型 "${id}" 吗？`)) return;
    await fetch(`/api/models?id=${id}`, { method: "DELETE" });
    refresh();
  };

  const handleToggle = async (model: ModelPublic) => {
    await fetch("/api/models", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: model.id, enabled: !model.enabled }),
    });
    refresh();
  };

  const handleTest = async (model: ModelPublic) => {
    setTestResult((prev) => ({ ...prev, [model.id]: { ok: false, msg: "测试中..." } }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Hi", modelIds: [model.id] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No body");
      const decoder = new TextDecoder();
      let content = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim().startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.trim().slice(6));
            if (ev.type === "chunk") content += ev.content;
            if (ev.type === "error") throw new Error(ev.error);
          } catch { /* skip */ }
        }
      }
      setTestResult((prev) => ({
        ...prev,
        [model.id]: { ok: true, msg: `✅ 连接成功 (${content.length} chars)` },
      }));
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [model.id]: { ok: false, msg: `❌ ${err instanceof Error ? err.message : "未知错误"}` },
      }));
    }
  };

  if (loading) {
    return (
      <>
        <Header user={user} onLogout={handleLogout} />
        <div className="flex items-center justify-center h-[80vh] text-slate-400">加载中...</div>
      </>
    );
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">⚙️ 模型配置</h1>
            <p className="text-sm text-slate-500 mt-1">管理对话中使用的大语言模型</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowAdd(true); }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 添加模型
          </button>
        </div>

        {(showAdd || editing) && (
          <ModelForm
            model={editing}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setShowAdd(false); }}
          />
        )}

        {/* Model list */}
        <div className="space-y-3">
          {models.map((model) => (
            <div
              key={model.id}
              className={`border rounded-xl p-4 transition-all ${
                model.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{model.icon}</span>
                  <div>
                    <div className="font-semibold text-slate-800">{model.name}</div>
                    <div className="text-xs text-slate-400 font-mono">
                      {model.modelId} · {model.baseUrl}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(model)}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    🧪 测试
                  </button>
                  <button
                    onClick={() => { setEditing(model); setShowAdd(false); }}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    onClick={() => handleToggle(model)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                      model.enabled
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {model.enabled ? "已启用" : "已禁用"}
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {testResult[model.id] && (
                <div
                  className={`mt-2 text-xs px-3 py-1.5 rounded-lg ${
                    testResult[model.id].ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {testResult[model.id].msg}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Platform notice */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
          <div className="font-semibold text-blue-800 mb-1">ℹ️ 当前支持平台</div>
          <p className="text-blue-700">
            当前仅支持<a href="https://bailian.console.aliyun.com" target="_blank" className="underline font-medium">阿里云百炼平台</a>的模型（DashScope API）。
            如需接入其他平台模型，请联系 <strong>zjq</strong>。
          </p>
        </div>
      </div>
    </>
  );
}

/** Model add/edit form */
function ModelForm({
  model,
  onSave,
  onCancel,
}: {
  model: ModelPublic | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    id: model?.id || "",
    name: model?.name || "",
    modelId: model?.modelId || "",
    baseUrl: model?.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    maxTokens: model?.maxTokens || 4096,
    temperature: model?.temperature ?? 0.7,
    enabled: model?.enabled ?? true,
    color: model?.color || COLORS[0],
    icon: model?.icon || ICONS[0],
    supportsSearch: model?.supportsSearch ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <form onSubmit={handleSubmit} className="mb-6 border-2 border-blue-200 rounded-xl p-6 bg-blue-50/30">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">
        {model ? "编辑模型" : "添加新模型"}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="模型 ID *" desc="唯一标识，如 qwen-max">
          <input value={form.id} onChange={(e) => set("id", e.target.value)} disabled={!!model}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400" placeholder="my-model" required />
        </Field>
        <Field label="显示名称 *" desc="前端显示用">
          <input value={form.name} onChange={(e) => set("name", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400" placeholder="通义千问 Max" required />
        </Field>
        <Field label="模型标识 *" desc="API 中的 model 参数">
          <input value={form.modelId} onChange={(e) => set("modelId", e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400" placeholder="qwen-max" required />
        </Field>
        <Field label="API 地址" desc="当前仅支持阿里云百炼平台">
          <div className="relative">
            <input value={form.baseUrl} readOnly
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔒</span>
          </div>
        </Field>
        <Field label="Max Tokens" desc="最大输出 token 数">
          <input type="number" value={form.maxTokens} onChange={(e) => set("maxTokens", +e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400" min={1} max={32768} />
        </Field>
        <Field label="Temperature" desc="生成温度 0-2">
          <input type="number" step="0.1" value={form.temperature}
            onChange={(e) => set("temperature", +e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400" min={0} max={2} />
        </Field>
        <Field label="图标" desc="选择一个 emoji">
          <div className="flex flex-wrap gap-2">
            {ICONS.map((ic) => (
              <button type="button" key={ic} onClick={() => set("icon", ic)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg border-2 transition-colors ${
                  form.icon === ic ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                }`}>
                {ic}
              </button>
            ))}
          </div>
        </Field>
        <Field label="颜色" desc="卡片标识色">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button type="button" key={c} onClick={() => set("color", c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  form.color === c ? "border-slate-800 scale-110" : "border-transparent"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>
        <Field label="联网搜索" desc="开启后用户可对该模型使用联网搜索（需模型支持 Tool Calling）">
          <button type="button" onClick={() => set("supportsSearch", !form.supportsSearch)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
              form.supportsSearch
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500"
            }`}>
            🌐 {form.supportsSearch ? "已开启" : "已关闭"}
          </button>
        </Field>
      </div>
      <div className="flex gap-3 mt-6">
        <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          {model ? "保存修改" : "添加模型"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
          取消
        </button>
      </div>

    </form>
  );
}

function Field({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {desc && <p className="text-xs text-slate-400 mb-1.5">{desc}</p>}
      {children}
    </div>
  );
}
