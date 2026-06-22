import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCustomerPortalUrl } from "@/lib/lemonsqueezy";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lsCustomerId: true },
    });

    if (!user?.lsCustomerId) {
      return Response.json({ error: "尚无订阅记录" }, { status: 404 });
    }

    const portalUrl = await getCustomerPortalUrl(user.lsCustomerId);
    return Response.json({ url: portalUrl });
  } catch (error) {
    console.error("[billing/portal]", error);
    return Response.json({ error: "获取门户链接失败" }, { status: 500 });
  }
}
