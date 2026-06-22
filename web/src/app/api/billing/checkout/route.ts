import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createCheckoutUrl } from "@/lib/lemonsqueezy";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!["basic", "pro", "team"].includes(plan)) {
      return Response.json({ error: "无效的套餐" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, lsCustomerId: true },
    });
    if (!user) return Response.json({ error: "用户不存在" }, { status: 404 });

    const checkoutUrl = await createCheckoutUrl(plan, user.email, user.id);
    return Response.json({ url: checkoutUrl });
  } catch (error) {
    console.error("[billing/checkout]", error);
    return Response.json({ error: "创建结账链接失败" }, { status: 500 });
  }
}
