import { auth } from "@/lib/auth";
import { analyzeSeo } from "@/lib/seo-analyzer";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const { content, keyword, metaTitle, metaDescription } = await req.json();

    if (!content?.trim() || !keyword?.trim()) {
      return Response.json({ error: "content 和 keyword 不能为空" }, { status: 400 });
    }

    const result = analyzeSeo(content, keyword, metaTitle, metaDescription);
    return Response.json(result);
  } catch (error) {
    console.error("[analyze/seo]", error);
    return Response.json({ error: "分析失败" }, { status: 500 });
  }
}
