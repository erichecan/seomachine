import { prisma } from "@/lib/db";
import { createHmac } from "crypto";
import type { Plan } from "@prisma/client";

// Map LS variant IDs to plan names
function variantToPlan(variantId: string): Plan | null {
  const map: Record<string, Plan> = {
    [process.env.LEMONSQUEEZY_VARIANT_BASIC ?? ""]: "basic",
    [process.env.LEMONSQUEEZY_VARIANT_PRO ?? ""]: "pro",
    [process.env.LEMONSQUEEZY_VARIANT_TEAM ?? ""]: "team",
  };
  return map[variantId] ?? null;
}

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
  const hash = createHmac("sha256", secret).update(body).digest("hex");
  return hash === signature;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-signature") ?? "";

    if (!verifySignature(body, signature)) {
      return Response.json({ error: "签名验证失败" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventName = event.meta?.event_name as string;
    const eventId = event.meta?.webhook_id as string;

    // Idempotency check
    const existing = await prisma.lsEvent.findUnique({ where: { id: eventId } });
    if (existing?.processed) {
      return Response.json({ received: true });
    }

    await prisma.lsEvent.upsert({
      where: { id: eventId },
      create: { id: eventId, eventName, payload: event, processed: false },
      update: {},
    });

    const attrs = event.data?.attributes;
    const userId = event.meta?.custom_data?.user_id as string;
    const customerId = String(attrs?.customer_id ?? "");
    const variantId = String(attrs?.variant_id ?? "");
    const subscriptionId = String(event.data?.id ?? "");

    const plan = variantToPlan(variantId);

    if (
      eventName === "subscription_created" ||
      eventName === "subscription_updated"
    ) {
      if (!userId || !plan) {
        console.warn("[ls webhook] Missing userId or unrecognized variantId", {
          userId,
          variantId,
        });
      } else {
        const status = attrs?.status as string;
        const isActive = ["active", "on_trial"].includes(status);

        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: isActive ? plan : "free",
            lsCustomerId: customerId || undefined,
            lsSubscriptionId: subscriptionId || undefined,
            planExpiresAt: isActive
              ? new Date(attrs?.renews_at ?? attrs?.ends_at)
              : null,
          },
        });
      }
    }

    if (
      eventName === "subscription_cancelled" ||
      eventName === "subscription_expired"
    ) {
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan: "free", planExpiresAt: null },
        });
      }
    }

    await prisma.lsEvent.update({
      where: { id: eventId },
      data: { processed: true },
    });

    return Response.json({ received: true });
  } catch (error) {
    console.error("[billing/webhook]", error);
    return Response.json({ error: "处理失败" }, { status: 500 });
  }
}
