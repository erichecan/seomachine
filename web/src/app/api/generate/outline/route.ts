import { auth } from "@/lib/auth";
import { selectModel } from "@/lib/llm";
import type { Plan } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { keyword, language = "en", audience, intent } = await req.json();
    if (!keyword?.trim()) {
      return Response.json({ error: "关键词不能为空" }, { status: 400 });
    }

    const userId = session.user.id;
    const plan = ((session.user as { plan?: string }).plan ?? "free") as Plan;

    const { model, client } = await selectModel(userId, plan);

    const systemPrompt = `You are an expert SEO content strategist. Create detailed article outlines that rank well in search engines and satisfy user search intent.`;

    const userPrompt = `Create a comprehensive SEO article outline for the keyword: "${keyword}"
${language !== "en" ? `Language: ${language}` : ""}
${audience ? `Target audience: ${audience}` : ""}
${intent ? `Search intent: ${intent}` : ""}

Return a JSON object with this structure:
{
  "title": "SEO-optimized H1 title",
  "metaDescription": "155-160 char meta description",
  "sections": [
    {
      "heading": "H2 heading",
      "subheadings": ["H3 subheading 1", "H3 subheading 2"],
      "keyPoints": ["key point to cover"]
    }
  ],
  "faqSection": [
    { "question": "FAQ question", "answer": "Brief answer" }
  ],
  "estimatedWordCount": 1500
}`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const outline = JSON.parse(response.choices[0].message.content ?? "{}");

    return Response.json({ outline, model });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DAILY_LIMIT_EXCEEDED") {
        return Response.json({ error: "今日生成已达上限" }, { status: 429 });
      }
      if (error.message === "MONTHLY_LIMIT_EXCEEDED") {
        return Response.json({ error: "本月生成已达上限" }, { status: 429 });
      }
    }
    console.error("[generate/outline]", error);
    return Response.json(
      {
        error: "生成失败",
        ...(process.env.NODE_ENV === "development" && {
          detail: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
