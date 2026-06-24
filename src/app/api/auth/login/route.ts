import { NextRequest, NextResponse } from "next/server";
import { signToken, setAuthCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || "multi-llm-arena-captcha-2026";

function verifyCaptcha(answer: string, token: string): boolean {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return false;
    const [expected, expires, sig] = parts;
    const payload = `${expected}:${expires}`;
    const expectedSig = crypto.createHmac("sha256", CAPTCHA_SECRET).update(payload).digest("hex").slice(0, 16);
    if (sig !== expectedSig) return false;
    if (Date.now() > Number(expires)) return false;
    return answer.toLowerCase() === expected.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { username, password, captcha, captchaToken } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });
  }

  if (!captcha || !captchaToken) {
    return NextResponse.json({ error: "请输入验证码" }, { status: 400 });
  }

  if (!verifyCaptcha(captcha, captchaToken)) {
    return NextResponse.json({ error: "验证码错误" }, { status: 400 });
  }

  try {
    const pg = eval('require("pg")');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

    const result = await pool.query('SELECT id, username, password, role FROM "User" WHERE username = $1', [username]);
    await pool.end();

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, username: user.username, role: user.role });
    const headers = setAuthCookie(token);

    return NextResponse.json(
      { id: user.id, username: user.username, role: user.role },
      { headers }
    );
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
