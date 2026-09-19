import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return jsonError(401, "Avtorizatsiya talab qilinadi");
  const user = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mustChangePass: true,
      isActive: true
    }
  });
  if (!user || !user.isActive) return jsonError(401, "Sessiya yaroqsiz");
  return NextResponse.json({ user });
}
