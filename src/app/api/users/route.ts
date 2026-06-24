import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET /api/users — list all users (super_admin only)
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  try {
    const pg = eval('require("pg")');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const result = await pool.query('SELECT id, username, role, "createdAt" FROM "User" ORDER BY "createdAt" DESC');
    await pool.end();
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("List users error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}

// POST /api/users — create user (super_admin only)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  const { username, password, role } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
  }

  if (!["user", "admin", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "无效的角色" }, { status: 400 });
  }

  try {
    const pg = eval('require("pg")');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    // Check duplicate
    const exists = await pool.query('SELECT id FROM "User" WHERE username = $1', [username]);
    if (exists.rows.length > 0) {
      await pool.end();
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO "User" (id, username, password, role, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW()) RETURNING id, username, role, "createdAt"',
      [username, hash, role]
    );
    await pool.end();

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
