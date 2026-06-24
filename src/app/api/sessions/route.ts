import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** GET /api/sessions — list user's sessions */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const sessions = await prisma.session.findMany({
    where: { userId: user.userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      title: s.title,
      modelIds: s.modelIds,
      messageCount: s._count.messages,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))
  );
}

/** POST /api/sessions — create new session */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { title, modelIds } = await req.json();

  const session = await prisma.session.create({
    data: {
      title: title || "新会话",
      userId: user.userId,
      modelIds: modelIds || [],
    },
  });

  return NextResponse.json(session, { status: 201 });
}
