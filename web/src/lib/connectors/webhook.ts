type WebhookConfig = {
  url: string;
  apiKey: string;
};

type WebhookPublishInput = {
  title: string;
  content: string; // Markdown
  targetKeyword?: string;
  metaDescription?: string;
  slug?: string;
};

export type PublishResult = {
  externalId: string;
  url: string;
};

export async function webhookPublish(
  config: WebhookConfig,
  input: WebhookPublishInput
): Promise<PublishResult> {
  const payload = {
    title: input.title,
    content: input.content,
    seo: {
      target_keyword: input.targetKeyword ?? "",
      meta_description: input.metaDescription ?? "",
      slug: input.slug ?? "",
    },
    metadata: {
      generated_at: new Date().toISOString(),
      source: "seomachine",
    },
  };

  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Webhook 请求失败 (${res.status}): ${err}`);
  }

  // Try to parse response for external ID, fall back gracefully
  try {
    const data = await res.json();
    return {
      externalId: String(data.id ?? data.postId ?? ""),
      url: data.url ?? data.link ?? "",
    };
  } catch {
    return { externalId: "", url: "" };
  }
}

export async function webhookTest(config: WebhookConfig): Promise<void> {
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify({ _test: true, source: "seomachine" }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Webhook 连接失败 (${res.status})`);
  }
}
