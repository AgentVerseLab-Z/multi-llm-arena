import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** POST /api/messages — save a message */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { sessionId, modelId, role, content, latencyMs, error } = await req.json();

  if (!sessionId || !role) {
    return NextResponse.json({ error: "Missing sessionId or role" }, { status: 400 });
  }

  // Verify session belongs to user
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId: user.userId } });
  if (!session) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  const message = await prisma.message.create({
    data: { sessionId, modelId, role, content: content || "", latencyMs, error },
  });

  // Auto-update session title from first user message
  if (role === "user") {
    const msgCount = await prisma.message.count({ where: { sessionId, role: "user" } });
    if (msgCount === 1) {
      const title = content.length > 30 ? content.slice(0, 30) + "..." : content;
      await prisma.session.update({ where: { id: sessionId }, data: { title } });
    }
  }

  return NextResponse.json(message, { status: 201 });
}
