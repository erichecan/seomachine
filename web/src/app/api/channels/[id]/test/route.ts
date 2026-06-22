import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { wordpressTest } from "@/lib/connectors/wordpress";
import { webhookTest } from "@/lib/connectors/webhook";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const channel = await prisma.channel.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!channel) {
      return Response.json({ error: "渠道不存在" }, { status: 404 });
    }

    const config = JSON.parse(await decrypt(channel.configEncrypted));

    try {
      if (channel.type === "wordpress") {
        await wordpressTest(config);
      } else if (channel.type === "webhook") {
        await webhookTest(config);
      } else {
        return Response.json({ error: "该渠道类型暂不支持连通性测试" }, { status: 400 });
      }

      await prisma.channel.update({
        where: { id },
        data: { status: "active", lastTestedAt: new Date() },
      });

      return Response.json({ success: true, message: "连接正常" });
    } catch (testError) {
      await prisma.channel.update({ where: { id }, data: { status: "error" } });
      return Response.json(
        {
          success: false,
          message: testError instanceof Error ? testError.message : "连接失败",
        },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error("[channels test]", error);
    return Response.json({ error: "测试失败" }, { status: 500 });
  }
}
