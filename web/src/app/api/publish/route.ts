import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { wordpressPublish } from "@/lib/connectors/wordpress";
import { webhookPublish } from "@/lib/connectors/webhook";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { articleId, channelId, publishStatus = "publish" } = await req.json();

    if (!articleId || !channelId) {
      return Response.json({ error: "articleId 和 channelId 不能为空" }, { status: 400 });
    }

    const [article, channel] = await Promise.all([
      prisma.article.findFirst({
        where: { id: articleId, userId: session.user.id },
      }),
      prisma.channel.findFirst({
        where: { id: channelId, userId: session.user.id },
      }),
    ]);

    if (!article) return Response.json({ error: "文章不存在" }, { status: 404 });
    if (!channel) return Response.json({ error: "渠道不存在" }, { status: 404 });

    const config = JSON.parse(await decrypt(channel.configEncrypted));
    let result: { externalId: string; url: string };

    if (channel.type === "wordpress") {
      result = await wordpressPublish(config, {
        title: article.title,
        content: article.contentHtml ?? article.content,
        status: publishStatus === "draft" ? "draft" : "publish",
        metaTitle: article.metaTitle ?? undefined,
        metaDescription: article.metaDescription ?? undefined,
        targetKeyword: article.targetKeyword,
      });
    } else if (channel.type === "webhook") {
      result = await webhookPublish(config, {
        title: article.title,
        content: article.content,
        targetKeyword: article.targetKeyword,
        metaDescription: article.metaDescription ?? undefined,
        slug: article.slug ?? undefined,
      });
    } else {
      return Response.json({ error: "该渠道类型暂不支持发布" }, { status: 400 });
    }

    await prisma.article.update({
      where: { id: articleId },
      data: {
        status: "published",
        publishedAt: new Date(),
        publishedChannelId: channelId,
        externalPostId: result.externalId,
      },
    });

    return Response.json({ success: true, externalId: result.externalId, url: result.url });
  } catch (error) {
    console.error("[publish]", error);
    return Response.json(
      {
        error: "发布失败",
        ...(process.env.NODE_ENV === "development" && {
          detail: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
