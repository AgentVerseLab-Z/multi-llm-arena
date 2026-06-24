import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// PATCH /api/users/[id] — update user role or password (super_admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const pg = eval('require("pg")');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    // Check user exists
    const exists = await pool.query('SELECT id FROM "User" WHERE id = $1', [id]);
    if (exists.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // Update role
    if (body.role) {
      if (!["user", "admin", "super_admin"].includes(body.role)) {
        await pool.end();
        return NextResponse.json({ error: "无效的角色" }, { status: 400 });
      }
      await pool.query('UPDATE "User" SET role = $1 WHERE id = $2', [body.role, id]);
    }

    // Reset password
    if (body.password) {
      const hash = await bcrypt.hash(body.password, 10);
      await pool.query('UPDATE "User" SET password = $1 WHERE id = $2', [hash, id]);
    }

    const result = await pool.query('SELECT id, username, role, "createdAt" FROM "User" WHERE id = $1', [id]);
    await pool.end();

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Update user error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// DELETE /api/users/[id] — delete user (super_admin only, cannot delete self)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { id } = await params;

  if (id === user.userId) {
    return NextResponse.json({ error: "不能删除自己" }, { status: 400 });
  }

  try {
    const pg = eval('require("pg")');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    // Delete user's messages -> sessions -> user
    await pool.query('DELETE FROM "Message" WHERE "sessionId" IN (SELECT id FROM "Session" WHERE "userId" = $1)', [id]);
    await pool.query('DELETE FROM "Session" WHERE "userId" = $1', [id]);
    await pool.query('DELETE FROM "User" WHERE id = $1', [id]);
    await pool.end();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
