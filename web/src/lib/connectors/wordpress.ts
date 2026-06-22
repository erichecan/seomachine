type WordPressConfig = {
  siteUrl: string;
  username: string;
  appPassword: string;
};

type WordPressPublishInput = {
  title: string;
  content: string; // HTML
  status?: "publish" | "draft";
  metaTitle?: string;
  metaDescription?: string;
  targetKeyword?: string;
  categories?: number[];
  tags?: number[];
};

export type PublishResult = {
  externalId: string;
  url: string;
};

export async function wordpressPublish(
  config: WordPressConfig,
  input: WordPressPublishInput
): Promise<PublishResult> {
  const { siteUrl, username, appPassword } = config;
  const credentials = Buffer.from(`${username}:${appPassword}`).toString("base64");
  const apiBase = siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";

  const body: Record<string, unknown> = {
    title: input.title,
    content: input.content,
    status: input.status ?? "draft",
  };

  if (input.categories?.length) body.categories = input.categories;
  if (input.tags?.length) body.tags = input.tags;

  // Yoast SEO meta fields
  if (input.metaTitle || input.metaDescription || input.targetKeyword) {
    body.meta = {
      ...(input.targetKeyword && { _yoast_wpseo_focuskw: input.targetKeyword }),
      ...(input.metaTitle && { _yoast_wpseo_title: input.metaTitle }),
      ...(input.metaDescription && { _yoast_wpseo_metadesc: input.metaDescription }),
    };
  }

  const res = await fetch(`${apiBase}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WordPress API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return { externalId: String(data.id), url: data.link };
}

export async function wordpressTest(config: WordPressConfig): Promise<void> {
  const { siteUrl, username, appPassword } = config;
  const credentials = Buffer.from(`${username}:${appPassword}`).toString("base64");
  const apiBase = siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";

  const res = await fetch(`${apiBase}/users/me`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    throw new Error(`WordPress 连接失败 (${res.status}): 请检查站点 URL 和应用程序密码`);
  }
}
