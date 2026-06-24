import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "请输入当前密码和新密码" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密码至少6位" }, { status: 400 });
  }

  try {
    const pg = eval('require("pg")');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    // Verify current password
    const result = await pool.query('SELECT password FROM "User" WHERE id = $1', [currentUser.userId]);
    if (result.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) {
      await pool.end();
      return NextResponse.json({ error: "当前密码错误" }, { status: 401 });
    }

    // Update password
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE "User" SET password = $1 WHERE id = $2', [newHash, currentUser.userId]);
    await pool.end();

    return NextResponse.json({ ok: true, message: "密码修改成功" });
  } catch (err) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
