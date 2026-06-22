import {
  lemonSqueezySetup,
  createCheckout,
  getCustomer,
  listSubscriptions,
} from "@lemonsqueezy/lemonsqueezy.js";

export function setupLS() {
  lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });
}

const VARIANT_MAP: Record<string, string> = {
  basic: process.env.LEMONSQUEEZY_VARIANT_BASIC ?? "",
  pro: process.env.LEMONSQUEEZY_VARIANT_PRO ?? "",
  team: process.env.LEMONSQUEEZY_VARIANT_TEAM ?? "",
};

export async function createCheckoutUrl(
  plan: "basic" | "pro" | "team",
  userEmail: string,
  userId: string
): Promise<string> {
  setupLS();

  const variantId = VARIANT_MAP[plan];
  if (!variantId) throw new Error(`未配置 ${plan} 套餐的 Variant ID`);

  const storeId = process.env.LEMONSQUEEZY_STORE_ID!;

  const { data, error } = await createCheckout(storeId, variantId, {
    checkoutOptions: {
      embed: false,
      media: false,
      logo: true,
    },
    checkoutData: {
      email: userEmail,
      custom: { user_id: userId },
    },
    productOptions: {
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      receiptButtonText: "进入控制台",
      receiptThankYouNote: "感谢订阅 SEO Machine！",
    },
  });

  if (error || !data) {
    throw new Error(`创建结账链接失败: ${error?.message ?? "未知错误"}`);
  }

  return data.data.attributes.url;
}

export async function getCustomerPortalUrl(lsCustomerId: string): Promise<string> {
  setupLS();
  const { data, error } = await getCustomer(lsCustomerId);
  if (error || !data) throw new Error("获取客户信息失败");
  return data.data.attributes.urls?.customer_portal ?? "";
}

export async function getActiveSubscription(lsCustomerId: string) {
  setupLS();
  const { data, error } = await listSubscriptions({
    filter: { customerId: lsCustomerId } as Record<string, string>,
  });
  if (error) throw new Error("获取订阅信息失败");
  return data?.data.find((s) =>
    ["active", "on_trial"].includes(s.attributes.status)
  );
}
