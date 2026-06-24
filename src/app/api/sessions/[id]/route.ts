import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/** GET /api/sessions/[id] — get session with messages */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.session.findFirst({
    where: { id, userId: user.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!session) return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  return NextResponse.json(session);
}

/** PATCH /api/sessions/[id] — update session (title, modelIds) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const session = await prisma.session.findFirst({ where: { id, userId: user.userId } });
  if (!session) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  const updated = await prisma.session.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.modelIds !== undefined && { modelIds: body.modelIds }),
    },
  });

  return NextResponse.json(updated);
}

/** DELETE /api/sessions/[id] — delete session */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.session.findFirst({ where: { id, userId: user.userId } });
  if (!session) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
