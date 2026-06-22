import { auth } from "@/lib/auth";
import { selectModel, incrementUsage } from "@/lib/llm";
import type { Plan } from "@prisma/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "未授权" }, { status: 401 });
  }

  const {
    keyword,
    outline,
    brandVoice,
    language = "en",
    wordCount,
  } = await req.json();

  if (!keyword?.trim()) {
    return Response.json({ error: "关键词不能为空" }, { status: 400 });
  }

  const userId = session.user.id;
  const plan = ((session.user as { plan?: string }).plan ?? "free") as Plan;

  let modelSelection: Awaited<ReturnType<typeof selectModel>>;
  try {
    modelSelection = await selectModel(userId, plan);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "DAILY_LIMIT_EXCEEDED") {
        return Response.json({ error: "今日生成已达上限" }, { status: 429 });
      }
      if (error.message === "MONTHLY_LIMIT_EXCEEDED") {
        return Response.json({ error: "本月生成已达上限" }, { status: 429 });
      }
    }
    return Response.json({ error: "用量检查失败" }, { status: 500 });
  }

  const { model, client, wordLimit } = modelSelection;
  const targetWords = Math.min(wordCount ?? wordLimit, wordLimit);

  const systemPrompt = `You are an expert SEO content writer. Write comprehensive, engaging articles that rank well in search engines.
${brandVoice ? `Brand voice: ${brandVoice}` : ""}
Always write in ${language === "zh" ? "Chinese (Simplified)" : "English"}.`;

  const outlineText = outline
    ? JSON.stringify(outline, null, 2)
    : `Write a complete article about "${keyword}"`;

  const userPrompt = `Write a complete SEO-optimized article about "${keyword}".

${outline ? `Follow this outline:\n${outlineText}` : ""}

Requirements:
- Target length: approximately ${targetWords} words
- Use proper markdown formatting (# for H1, ## for H2, ### for H3)
- Include the target keyword naturally throughout
- Write engaging, informative content that provides real value
- Start with a compelling introduction
- End with a conclusion/call-to-action
- Do NOT include the meta description in the article body`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let totalInput = 0;
      let totalOutput = 0;

      try {
        const streamResponse = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: Math.ceil(targetWords * 1.5),
        });

        for await (const chunk of streamResponse) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`)
            );
          }

          if (chunk.usage) {
            totalInput = chunk.usage.prompt_tokens;
            totalOutput = chunk.usage.completion_tokens;
          }
        }

        await incrementUsage(userId, totalInput, totalOutput);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, model, tokensInput: totalInput, tokensOutput: totalOutput })}\n\n`
          )
        );
      } catch (error) {
        console.error("[generate/article stream]", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "生成中断" })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
