import { auth } from "@/lib/auth";
import { selectModel } from "@/lib/llm";
import type { Plan } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { keyword, title, content, language = "en" } = await req.json();
    if (!keyword?.trim()) {
      return Response.json({ error: "关键词不能为空" }, { status: 400 });
    }

    const userId = session.user.id;
    const plan = ((session.user as { plan?: string }).plan ?? "free") as Plan;
    const { model, client } = await selectModel(userId, plan);

    const prompt = `Generate SEO metadata for an article.

Keyword: "${keyword}"
${title ? `Article title: "${title}"` : ""}
${content ? `Article excerpt: "${content.slice(0, 500)}"` : ""}
Language: ${language === "zh" ? "Chinese (Simplified)" : "English"}

Return JSON:
{
  "metaTitle": "55-60 char title with keyword",
  "metaDescription": "150-160 char compelling description with keyword",
  "slug": "url-friendly-slug-with-keyword",
  "focusKeyphrase": "${keyword}",
  "openGraphTitle": "Social media title (can be slightly longer)",
  "openGraphDescription": "Social media description"
}`;

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const meta = JSON.parse(response.choices[0].message.content ?? "{}");
    return Response.json({ meta, model });
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "DAILY_LIMIT_EXCEEDED" ||
        error.message === "MONTHLY_LIMIT_EXCEEDED"
      ) {
        return Response.json({ error: "生成已达上限" }, { status: 429 });
      }
    }
    console.error("[generate/seo-meta]", error);
    return Response.json({ error: "生成失败" }, { status: 500 });
  }
}
