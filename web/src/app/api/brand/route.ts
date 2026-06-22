import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const config = await prisma.brandConfig.findUnique({
      where: { userId: session.user.id },
    });

    return Response.json({ config: config ?? null });
  } catch (error) {
    console.error("[brand GET]", error);
    return Response.json({ error: "获取品牌配置失败" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "未授权" }, { status: 401 });
    }

    const body = await req.json();
    const {
      brandVoice,
      styleGuide,
      seoGuidelines,
      internalLinks,
      targetKeywords,
      writingExamples,
      competitorSites,
    } = body;

    const config = await prisma.brandConfig.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        brandVoice: brandVoice ?? null,
        styleGuide: styleGuide ?? null,
        seoGuidelines: seoGuidelines ?? null,
        internalLinks: internalLinks ?? [],
        targetKeywords: targetKeywords ?? [],
        writingExamples: writingExamples ?? [],
        competitorSites: competitorSites ?? [],
      },
      update: {
        ...(brandVoice !== undefined && { brandVoice }),
        ...(styleGuide !== undefined && { styleGuide }),
        ...(seoGuidelines !== undefined && { seoGuidelines }),
        ...(internalLinks !== undefined && { internalLinks }),
        ...(targetKeywords !== undefined && { targetKeywords }),
        ...(writingExamples !== undefined && { writingExamples }),
        ...(competitorSites !== undefined && { competitorSites }),
      },
    });

    return Response.json({ config });
  } catch (error) {
    console.error("[brand PUT]", error);
    return Response.json({ error: "保存品牌配置失败" }, { status: 500 });
  }
}
