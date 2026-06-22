import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const channels = await prisma.channel.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        lastTestedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ channels });
  } catch (error) {
    console.error("[channels GET]", error);
    return Response.json({ error: "获取渠道失败" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { name, type, config } = await req.json();

    if (!name?.trim() || !type || !config) {
      return Response.json({ error: "name、type、config 不能为空" }, { status: 400 });
    }

    if (!["wordpress", "shopify", "webhook"].includes(type)) {
      return Response.json({ error: "无效的渠道类型" }, { status: 400 });
    }

    const configEncrypted = await encrypt(JSON.stringify(config));

    const channel = await prisma.channel.create({
      data: {
        userId: session.user.id,
        name,
        type,
        configEncrypted,
      },
      select: { id: true, name: true, type: true, status: true, createdAt: true },
    });

    return Response.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("[channels POST]", error);
    return Response.json({ error: "创建渠道失败" }, { status: 500 });
  }
}
