import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const org = await prisma.organization_profile.findFirst();
    return NextResponse.json({
      organization: org || { id: 0, app_name: "Cashflow App", name: "Aplikasi Keuangan", subtitle: null, address: null, logo_path: null },
    });
  } catch (error) {
    console.error("Organization GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { app_name, name, subtitle, address, logo_path } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama organisasi harus diisi" }, { status: 400 });
    }

    const existing = await prisma.organization_profile.findFirst();

    let org;
    if (existing) {
      org = await prisma.organization_profile.update({
        where: { id: existing.id },
        data: {
          app_name: app_name?.trim() || undefined,
          name: name.trim(),
          subtitle: subtitle || null,
          address: address || null,
          logo_path: logo_path !== undefined ? logo_path : undefined,
        },
      });
    } else {
      org = await prisma.organization_profile.create({
        data: {
          app_name: app_name?.trim() || "Cashflow App",
          name: name.trim(),
          subtitle: subtitle || null,
          address: address || null,
          logo_path: logo_path || null,
        },
      });
    }

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.SETTING_CHANGE,
      entityType: "organization_profile",
      entityId: org.id,
      oldValue: existing,
      newValue: org,
      request,
    });

    return NextResponse.json({ success: true, organization: org });
  } catch (error) {
    console.error("Organization POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
