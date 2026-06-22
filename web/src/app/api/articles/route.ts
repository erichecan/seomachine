import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ArticleStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as ArticleStatus | null;
    const keyword = searchParams.get("keyword");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20"));

    const where = {
      userId: session.user.id,
      ...(status && { status }),
      ...(keyword && {
        OR: [
          { title: { contains: keyword, mode: "insensitive" as const } },
          { targetKeyword: { contains: keyword, mode: "insensitive" as const } },
        ],
      }),
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        select: {
          id: true,
          title: true,
          targetKeyword: true,
          status: true,
          seoScore: true,
          wordCount: true,
          language: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          channel: { select: { id: true, name: true, type: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.article.count({ where }),
    ]);

    return Response.json({ articles, total, page, pageSize });
  } catch (error) {
    console.error("[articles GET]", error);
    return Response.json({ error: "获取文章失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      content,
      contentHtml,
      targetKeyword,
      metaTitle,
      metaDescription,
      slug,
      seoScore,
      wordCount,
      language = "en",
      status = "draft",
    } = body;

    if (!title?.trim() || !targetKeyword?.trim()) {
      return Response.json({ error: "title 和 targetKeyword 不能为空" }, { status: 400 });
    }

    const article = await prisma.article.create({
      data: {
        userId: session.user.id,
        title,
        content: content ?? "",
        contentHtml: contentHtml ?? null,
        targetKeyword,
        metaTitle: metaTitle ?? null,
        metaDescription: metaDescription ?? null,
        slug: slug ?? null,
        seoScore: seoScore ?? null,
        wordCount: wordCount ?? 0,
        language,
        status,
      },
    });

    return Response.json({ article }, { status: 201 });
  } catch (error) {
    console.error("[articles POST]", error);
    return Response.json({ error: "创建文章失败" }, { status: 500 });
  }
}
