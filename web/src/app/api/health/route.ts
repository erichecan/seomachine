import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] DB error:", error);
    return Response.json(
      {
        status: "error",
        db: "disconnected",
        message: error instanceof Error ? error.message : "unknown",
      },
      { status: 503 }
    );
  }
}
