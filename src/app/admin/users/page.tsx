"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

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

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 border-red-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  user: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function UsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ username: string; role: string; userId: string } | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // New user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        setUser(data);
        if (data.role !== "super_admin") router.push("/");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const loadUsers = useCallback(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (user) loadUsers(); }, [user, loadUsers]);

  const showMsg = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleCreate = async () => {
    if (!newUsername || !newPassword) return;
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
    if (res.ok) {
      showMsg("ok", "权限已更新");
      setEditingRole(null);
      loadUsers();
    } else {
      const data = await res.json();
      showMsg("err", data.error || "更新失败");
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!resetPwValue || resetPwValue.length < 6) {
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

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`确定删除用户 ${username} 吗？此操作不可撤销。`)) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      showMsg("ok", `用户 ${username} 已删除`);
      loadUsers();
    } else {
      const data = await res.json();
      showMsg("err", data.error || "删除失败");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return <><Header user={user} onLogout={handleLogout} /><div className="flex items-center justify-center h-[calc(100vh-56px)] text-slate-400">加载中...</div></>;
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} />
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">👥 用户管理</h1>
            <p className="text-sm text-slate-500 mt-1">管理所有用户账号和权限</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            + 添加用户
          </button>
        </div>

        {/* Toast */}
        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.text}
          </div>
        )}

        {/* Add user form */}
        {showAdd && (
          <div className="mb-6 border-2 border-blue-200 rounded-xl p-5 bg-blue-50/30">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">添加新用户</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="username" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="至少6位" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                  <option value="super_admin">超级管理员</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleCreate} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">创建</button>
              <button onClick={() => setShowAdd(false)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">取消</button>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">用户名</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">角色</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">创建时间</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{u.username}</span>
                      {u.id === user?.userId && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">你</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingRole === u.id ? (
                      <select
                        defaultValue={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        onBlur={() => setEditingRole(null)}
                        className="px-2 py-1 border border-slate-300 rounded text-xs bg-white outline-none"
                        autoFocus
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                        <option value="super_admin">超级管理员</option>
                      </select>
                    ) : (
                      <button onClick={() => setEditingRole(u.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 ${roleColors[u.role] || roleColors.user}`}>
                        {roleLabels[u.role] || u.role}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                    {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {resetPwId === u.id ? (
                        <div className="flex items-center gap-1">
                          <input type="password" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)}
                            placeholder="新密码" className="px-2 py-1 border border-slate-300 rounded text-xs w-24 outline-none focus:ring-1 focus:ring-blue-500" />
                          <button onClick={() => handleResetPassword(u.id)} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">确定</button>
                          <button onClick={() => { setResetPwId(null); setResetPwValue(""); }} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700">取消</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => setResetPwId(u.id)}
                            className="px-2.5 py-1 text-xs border border-slate-200 rounded text-slate-600 hover:bg-slate-50">重置密码</button>
                          {u.id !== user?.userId && (
                            <button onClick={() => handleDelete(u.id, u.username)}
                              className="px-2.5 py-1 text-xs border border-red-200 rounded text-red-600 hover:bg-red-50">删除</button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Role explanation */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          <div className="font-semibold text-slate-700 mb-2">权限说明</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5"></span><strong>超级管理员</strong> — 管理用户 + 模型配置 + 聊天</div>
            <div><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span><strong>管理员</strong> — 模型配置 + 聊天</div>
            <div><span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1.5"></span><strong>普通用户</strong> — 仅聊天</div>
          </div>
        </div>
      </div>
    </>
  );
}
