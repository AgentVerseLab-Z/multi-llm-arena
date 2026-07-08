"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import MobileShell from "@/components/mobile/MobileShell";
import MobileSheet from "@/components/mobile/MobileSheet";

/**
 * 文件说明：移动端用户管理页面。
 * 作者：Codex
 * 用途：为超级管理员提供手机端用户创建、权限修改、重置密码和删除能力。
 */

interface UserItem {
  id: string;
  username: string;
  role: string;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  user: "普通用户",
};

const roleClasses: Record<string, string> = {
  super_admin: "bg-red-50 text-red-700 border-red-200",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  user: "bg-slate-100 text-slate-600 border-slate-200",
};

/**
 * 功能：渲染移动端用户管理页。
 * 入参：无。
 * 出参：React 页面节点。
 * 异常：未登录或权限不足跳转；接口错误展示 toast。
 * 示例：访问 /m/admin/users。
 */
export default function MobileUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string; userId: string } | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");

  const showMsg = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const loadUsers = useCallback(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("unauthorized");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        if (data.role !== "super_admin") router.push("/m");
      })
      .catch(() => router.push("/m/login"));
  }, [router]);

  useEffect(() => {
    if (user) loadUsers();
  }, [user, loadUsers]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/m/login");
  };

  const handleCreate = async () => {
    if (!newUsername || !newPassword) {
      showMsg("err", "用户名和密码不能为空");
      return;
    }
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
    });
    const data = await res.json();
    if (res.ok) {
      showMsg("ok", `用户 ${data.username} 创建成功`);
      setShowAdd(false);
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      loadUsers();
    } else {
      showMsg("err", data.error || "创建失败");
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showMsg("ok", "权限已更新");
      setEditingRole(null);
      loadUsers();
    } else {
      showMsg("err", data.error || "更新失败");
    }
  };

  const handleResetPassword = async (id: string) => {
    if (resetPwValue.length < 6) {
      showMsg("err", "密码至少6位");
      return;
    }
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPwValue }),
    });
    if (res.ok) {
      showMsg("ok", "密码已重置");
      setResetPwId(null);
      setResetPwValue("");
    } else {
      showMsg("err", "重置失败");
    }
  };

  const handleDelete = async (item: UserItem) => {
    if (!confirm(`确定删除用户 ${item.username} 吗？此操作不可撤销。`)) return;
    const res = await fetch(`/api/users/${item.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      showMsg("ok", `用户 ${item.username} 已删除`);
      loadUsers();
    } else {
      showMsg("err", data.error || "删除失败");
    }
  };

  if (loading) {
    return (
      <MobileShell title="用户管理" user={user} onLogout={handleLogout}>
        <div className="py-20 text-center text-sm text-slate-400">加载中...</div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="用户管理"
      subtitle="移动端管理"
      user={user}
      onLogout={handleLogout}
      right={
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white"
          aria-label="添加用户"
        >
          <Plus className="h-4 w-4" />
        </button>
      }
    >
      {msg && (
        <div className={`mb-4 rounded-2xl px-3 py-2 text-sm ${
          msg.type === "ok" ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-700"
        }`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        {users.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
                {item.username[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-slate-900">{item.username}</h2>
                  {item.id === user?.userId && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">你</span>}
                </div>
                <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString("zh-CN")}</p>
              </div>
            </div>

            <div className="mt-4">
              {editingRole === item.id ? (
                <select
                  defaultValue={item.role}
                  onChange={(event) => handleRoleChange(item.id, event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                  <option value="super_admin">超级管理员</option>
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingRole(item.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${roleClasses[item.role] || roleClasses.user}`}
                >
                  {roleLabels[item.role] || item.role}
                </button>
              )}
            </div>

            {resetPwId === item.id ? (
              <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3">
                <input
                  type="password"
                  value={resetPwValue}
                  onChange={(event) => setResetPwValue(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="输入新密码"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleResetPassword(item.id)} className="rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white">确定</button>
                  <button type="button" onClick={() => { setResetPwId(null); setResetPwValue(""); }} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">取消</button>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setResetPwId(item.id)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">重置密码</button>
                {item.id !== user?.userId && (
                  <button type="button" onClick={() => handleDelete(item)} className="rounded-2xl border border-red-200 px-3 py-2 text-sm text-red-600">删除</button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-800">权限说明</h2>
        <p>超级管理员：管理用户、模型配置和聊天。</p>
        <p className="mt-1">管理员：模型配置和聊天。</p>
        <p className="mt-1">普通用户：仅聊天。</p>
      </section>

      <MobileSheet open={showAdd} title="添加用户" onClose={() => setShowAdd(false)}>
        <div className="space-y-4">
          <TextField label="用户名" value={newUsername} onChange={setNewUsername} placeholder="username" />
          <TextField label="密码" type="password" value={newPassword} onChange={setNewPassword} placeholder="至少6位" />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">角色</span>
            <select value={newRole} onChange={(event) => setNewRole(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm">
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
              <option value="super_admin">超级管理员</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleCreate} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">创建</button>
            <button type="button" onClick={() => setShowAdd(false)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">取消</button>
          </div>
        </div>
      </MobileSheet>
    </MobileShell>
  );
}

/**
 * 功能：渲染移动端文本输入项。
 * 入参：label 标签；type 输入类型；value 值；onChange 更新回调；placeholder 占位文案。
 * 出参：React 节点。
 * 异常：无。
 * 示例：<TextField label="用户名" value={name} onChange={setName} />。
 */
function TextField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
