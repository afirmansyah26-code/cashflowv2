import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint - no auth required (used for favicon, title, login page)
export async function GET() {
  try {
    const org = await prisma.organization_profile.findFirst({
      select: { app_name: true, subtitle: true, logo_path: true },
    });
    return NextResponse.json({
      app_name: org?.app_name || "Cashflow App",
      subtitle: org?.subtitle || null,
      logo_path: org?.logo_path || null,
    });
  } catch {
    return NextResponse.json({ app_name: "Cashflow App", subtitle: null, logo_path: null });
  }
}
