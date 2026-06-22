import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email?.trim() || !password) {
      return Response.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "密码至少 8 位" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name?.trim() || null,
        emailVerified: new Date(), // skip verification for MVP
      },
      select: { id: true, email: true, name: true, plan: true },
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[auth/register]", error);
    return Response.json({ error: "注册失败" }, { status: 500 });
  }
}
