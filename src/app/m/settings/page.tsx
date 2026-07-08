"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import MobileShell from "@/components/mobile/MobileShell";
import MobileSheet from "@/components/mobile/MobileSheet";
import type { ModelPublic } from "@/lib/types";

/**
 * 文件说明：移动端模型配置页面。
 * 作者：Codex
 * 用途：为管理员提供独立移动端模型管理和 API Key 管理 UI。
 */

const COLORS = ["#f97316", "#22c55e", "#a855f7", "#3b82f6", "#ec4899", "#eab308", "#14b8a6", "#ef4444", "#6366f1"];
const ICONS = ["🟠", "🟢", "🟣", "🔵", "🩷", "🟡", "🩵", "🔴", "🟤", "🤖", "🧠", "⚡", "🔥", "💎", "🌟"];

interface ApiKeyPreset {
  env: string;
  label: string;
  url: string;
}

interface ModelFormState {
  name: string;
  modelId: string;
  urlMode: string;
  customUrl: string;
  apiKeyMode: string;
  customApiKeyEnv: string;
  customApiKey: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  color: string;
  icon: string;
  supportsSearch: boolean;
}

/**
 * 功能：渲染移动端模型配置页。
 * 入参：无。
 * 出参：React 页面节点。
 * 异常：未登录或权限不足跳转；接口错误通过局部状态提示。
 * 示例：访问 /m/settings。
 */
export default function MobileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [models, setModels] = useState<ModelPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ModelPublic | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [apiKeyPresets, setApiKeyPresets] = useState<ApiKeyPreset[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, { configured: boolean }>>({});

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/m/login");
  }, [router]);

  const refreshModels = useCallback(() => {
    fetch("/api/models").then((res) => res.json()).then(setModels).catch(() => {});
  }, []);

  const refreshKeys = useCallback(() => {
    fetch("/api/apikeys")
      .then((res) => res.json())
      .then((data) => {
        setApiKeyPresets(data.presets || []);
        setApiKeyStatus(data.keys || {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        if (data.role !== "admin" && data.role !== "super_admin") router.push("/m");
      })
      .catch(() => router.push("/m/login"));
  }, [router]);

  useEffect(() => {
    refreshModels();
    refreshKeys();
    setLoading(false);
  }, [refreshModels, refreshKeys]);

  const handleSaveApiKey = async (key: string, value: string) => {
    const res = await fetch("/api/apikeys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) refreshKeys();
    return res.ok;
  };

  const handleSaveModel = async (payload: Partial<ModelPublic>) => {
    const method = editing ? "PUT" : "POST";
    const body = editing ? { ...payload, id: editing.id } : payload;
    const res = await fetch("/api/models", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      refreshModels();
      setEditing(null);
      setShowForm(false);
    }
  };

  const handleToggle = async (model: ModelPublic) => {
    await fetch("/api/models", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: model.id, enabled: !model.enabled }),
    });
    refreshModels();
  };

  const handleDelete = async (model: ModelPublic) => {
    if (!confirm(`确定删除模型 #${model.id} 吗？`)) return;
    await fetch(`/api/models?id=${model.id}`, { method: "DELETE" });
    refreshModels();
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
      setTestResult((prev) => ({ ...prev, [model.id]: { ok: true, msg: "连接成功" } }));
    } catch (err) {
      setTestResult((prev) => ({ ...prev, [model.id]: { ok: false, msg: err instanceof Error ? err.message : "测试失败" } }));
    }
  };

  if (loading) {
    return (
      <MobileShell title="模型配置" user={user} onLogout={handleLogout}>
        <div className="py-20 text-center text-sm text-slate-400">加载中...</div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="模型配置"
      subtitle="移动端管理"
      user={user}
      onLogout={handleLogout}
      right={
        <button
          type="button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white"
          aria-label="添加模型"
        >
          <Plus className="h-4 w-4" />
        </button>
      }
    >
      <ApiKeyManager presets={apiKeyPresets} status={apiKeyStatus} onSave={handleSaveApiKey} onRefresh={refreshKeys} />

      <div className="mt-4 space-y-3">
        {models.map((model) => (
          <article key={model.id} className={`rounded-3xl border bg-white p-4 shadow-sm ${model.enabled ? "border-slate-200" : "border-slate-100 opacity-70"}`}>
            <div className="flex items-start gap-3">
              <div className="text-3xl">{model.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-900">{model.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">#{model.id}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{model.modelId}</p>
                <p className="mt-1 truncate text-[11px] text-slate-400">{model.baseUrl}</p>
              </div>
            </div>
            {testResult[model.id] && (
              <div className={`mt-3 rounded-2xl px-3 py-2 text-xs ${
                testResult[model.id].ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}>
                {testResult[model.id].msg}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => handleTest(model)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">测试</button>
              <button type="button" onClick={() => { setEditing(model); setShowForm(true); }} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">编辑</button>
              <button
                type="button"
                onClick={() => handleToggle(model)}
                className={`rounded-2xl px-3 py-2 text-sm font-medium ${model.enabled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}
              >
                {model.enabled ? "已启用" : "已禁用"}
              </button>
              <button type="button" onClick={() => handleDelete(model)} className="rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-600">删除</button>
            </div>
          </article>
        ))}
      </div>

      <MobileSheet open={showForm} title={editing ? `编辑模型 #${editing.id}` : "添加模型"} onClose={() => { setShowForm(false); setEditing(null); }}>
        <ModelForm
          model={editing}
          presets={apiKeyPresets}
          status={apiKeyStatus}
          onSave={handleSaveModel}
          onSaveApiKey={handleSaveApiKey}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      </MobileSheet>
    </MobileShell>
  );
}

/**
 * 功能：渲染移动端 API Key 管理卡片。
 * 入参：presets 预设；status 配置状态；onSave 保存回调；onRefresh 刷新回调。
 * 出参：React 节点。
 * 异常：保存失败时保持编辑状态。
 * 示例：<ApiKeyManager presets={presets} status={status} onSave={save} />。
 */
function ApiKeyManager({
  presets,
  status,
  onSave,
  onRefresh,
}: {
  presets: ApiKeyPreset[];
  status: Record<string, { configured: boolean }>;
  onSave: (key: string, value: string) => Promise<boolean>;
  onRefresh: () => void;
}) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const allKeys = Array.from(new Set([...presets.map((preset) => preset.env), ...Object.keys(status)]));

  const handleSave = async () => {
    if (!editingKey || !value.trim()) return;
    const ok = await onSave(editingKey, value.trim());
    if (ok) {
      setEditingKey(null);
      setValue("");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">API Key 管理</h2>
        <button type="button" onClick={onRefresh} className="flex items-center gap-1 text-xs text-slate-500">
          <RefreshCw className="h-3.5 w-3.5" />
          刷新
        </button>
      </div>
      <div className="space-y-2">
        {allKeys.map((key) => {
          const preset = presets.find((item) => item.env === key);
          const configured = status[key]?.configured ?? false;
          const editing = editingKey === key;
          return (
            <div key={key} className="rounded-2xl bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">{preset?.label || key}</div>
                  <div className="truncate text-xs font-mono text-slate-400">{key}</div>
                </div>
                <span className={`shrink-0 text-xs ${configured ? "text-green-600" : "text-slate-400"}`}>
                  {configured ? "已配置" : "未配置"}
                </span>
              </div>
              {editing ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="password"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="输入 API Key"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={handleSave} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white">保存</button>
                    <button type="button" onClick={() => { setEditingKey(null); setValue(""); }} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">取消</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setEditingKey(key)} className="mt-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  {configured ? "修改" : "配置"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * 功能：渲染移动端模型新增/编辑表单。
 * 入参：model 当前模型；presets API 预设；status Key 状态；onSave 保存模型；onSaveApiKey 保存 Key；onCancel 取消。
 * 出参：React 节点。
 * 异常：自定义 Key 保存失败时仍阻止模型保存。
 * 示例：<ModelForm model={model} onSave={save} />。
 */
function ModelForm({
  model,
  presets,
  status,
  onSave,
  onSaveApiKey,
  onCancel,
}: {
  model: ModelPublic | null;
  presets: ApiKeyPreset[];
  status: Record<string, { configured: boolean }>;
  onSave: (payload: Partial<ModelPublic>) => Promise<void>;
  onSaveApiKey: (key: string, value: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const customUrl = model?.baseUrl && !presets.some((preset) => preset.url === model.baseUrl);
  const [form, setForm] = useState<ModelFormState>({
    name: model?.name || "",
    modelId: model?.modelId || "",
    urlMode: customUrl ? "custom" : (model?.apiKeyEnv || presets[0]?.env || "DASHSCOPE_API_KEY"),
    customUrl: customUrl ? model?.baseUrl || "" : "",
    apiKeyMode: model?.apiKeyEnv || presets[0]?.env || "DASHSCOPE_API_KEY",
    customApiKeyEnv: "",
    customApiKey: "",
    maxTokens: model?.maxTokens || 4096,
    temperature: model?.temperature ?? 0.7,
    enabled: model?.enabled ?? true,
    color: model?.color || COLORS[0],
    icon: model?.icon || ICONS[0],
    supportsSearch: model?.supportsSearch ?? true,
  });

  const set = (key: keyof ModelFormState, value: ModelFormState[keyof ModelFormState]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.apiKeyMode === "custom" && form.customApiKeyEnv && form.customApiKey) {
      const ok = await onSaveApiKey(form.customApiKeyEnv, form.customApiKey);
      if (!ok) return;
    }
    const preset = presets.find((item) => item.env === form.urlMode);
    const baseUrl = form.urlMode === "custom" ? form.customUrl : preset?.url || form.customUrl;
    await onSave({
      name: form.name,
      modelId: form.modelId,
      baseUrl,
      apiKeyEnv: form.apiKeyMode === "custom" ? form.customApiKeyEnv : form.apiKeyMode,
      maxTokens: form.maxTokens,
      temperature: form.temperature,
      enabled: form.enabled,
      color: form.color,
      icon: form.icon,
      supportsSearch: form.supportsSearch,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <TextField label="显示名称" value={form.name} onChange={(value) => set("name", value)} placeholder="通义千问 Max" required />
      <TextField label="模型标识" value={form.modelId} onChange={(value) => set("modelId", value)} placeholder="qwen-max" required />

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">API 地址</span>
        <select value={form.urlMode} onChange={(event) => set("urlMode", event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm">
          {presets.map((preset) => <option key={preset.env} value={preset.env}>{preset.label}</option>)}
          <option value="custom">自定义</option>
        </select>
      </label>
      {form.urlMode === "custom" && (
        <TextField label="自定义 API 地址" value={form.customUrl} onChange={(value) => set("customUrl", value)} placeholder="https://your-api.com/v1" required />
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">API Key</span>
        <select value={form.apiKeyMode} onChange={(event) => set("apiKeyMode", event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm">
          {presets.map((preset) => (
            <option key={preset.env} value={preset.env}>{preset.label} {status[preset.env]?.configured ? "已配置" : "未配置"}</option>
          ))}
          <option value="custom">自定义</option>
        </select>
      </label>
      {form.apiKeyMode === "custom" && (
        <>
          <TextField label="自定义变量名" value={form.customApiKeyEnv} onChange={(value) => set("customApiKeyEnv", value)} placeholder="MY_CUSTOM_KEY" required />
          <TextField label="API Key 值" type="password" value={form.customApiKey} onChange={(value) => set("customApiKey", value)} placeholder="输入 API Key" required />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Max Tokens" value={form.maxTokens} onChange={(value) => set("maxTokens", value)} min={1} max={32768} />
        <NumberField label="Temperature" value={form.temperature} onChange={(value) => set("temperature", value)} min={0} max={2} step={0.1} />
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-700">图标</div>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((icon) => (
            <button key={icon} type="button" onClick={() => set("icon", icon)} className={`h-10 w-10 rounded-2xl border text-lg ${form.icon === icon ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>{icon}</button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-700">颜色</div>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((color) => (
            <button key={color} type="button" onClick={() => set("color", color)} className={`h-9 w-9 rounded-full border-2 ${form.color === color ? "border-slate-900" : "border-transparent"}`} style={{ background: color }} />
          ))}
        </div>
      </div>

      <button type="button" onClick={() => set("supportsSearch", !form.supportsSearch)} className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium ${form.supportsSearch ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}>
        联网搜索：{form.supportsSearch ? "已开启" : "已关闭"}
      </button>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button type="submit" className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">保存</button>
        <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">取消</button>
      </div>
    </form>
  );
}

/**
 * 功能：渲染文本输入字段。
 * 入参：字段配置和值更新回调。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<TextField label="名称" value={value} onChange={setValue} />。
 */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

/**
 * 功能：渲染数字输入字段。
 * 入参：label 标签；value 数值；onChange 更新回调；min/max/step 限制。
 * 出参：React 节点。
 * 异常：非法输入转为 0。
 * 示例：<NumberField label="Temperature" value={0.7} onChange={setValue} />。
 */
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
