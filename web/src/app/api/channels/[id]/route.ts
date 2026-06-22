import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.channel.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return Response.json({ error: "渠道不存在" }, { status: 404 });
    }

    const { name, config } = await req.json();
    const updateData: Record<string, unknown> = {};
    if (name?.trim()) updateData.name = name;
    if (config) updateData.configEncrypted = await encrypt(JSON.stringify(config));

    const channel = await prisma.channel.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, type: true, status: true, updatedAt: true },
    });

    return Response.json({ channel });
  } catch (error) {
    console.error("[channels PUT]", error);
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
    const existing = await prisma.channel.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return Response.json({ error: "渠道不存在" }, { status: 404 });
    }

    await prisma.channel.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[channels DELETE]", error);
    return Response.json({ error: "删除失败" }, { status: 500 });
  }
}
