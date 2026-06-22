import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const article = await prisma.article.findFirst({
      where: { id, userId: session.user.id },
      include: { channel: { select: { id: true, name: true, type: true } } },
    });

    if (!article) return Response.json({ error: "文章不存在" }, { status: 404 });
    return Response.json({ article });
  } catch (error) {
    console.error("[articles GET id]", error);
    return Response.json({ error: "获取文章失败" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.article.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) return Response.json({ error: "文章不存在" }, { status: 404 });

    const body = await req.json();
    const allowed = [
      "title", "content", "contentHtml", "targetKeyword",
      "metaTitle", "metaDescription", "slug",
      "seoScore", "wordCount", "language", "status",
    ];

    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key];
    }

    const article = await prisma.article.update({
      where: { id },
      data: updateData,
    });

    return Response.json({ article });
  } catch (error) {
    console.error("[articles PUT]", error);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.article.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) return Response.json({ error: "文章不存在" }, { status: 404 });

    await prisma.article.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[articles DELETE]", error);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
