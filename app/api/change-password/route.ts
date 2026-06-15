import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json({ error: "Semua field harus diisi" }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: "Password baru minimal 6 karakter" }, { status: 400 });
    }

    const user = await prisma.users.findUnique({ where: { id: auth.session.id } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Password lama salah" }, { status: 401 });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await prisma.users.update({
      where: { id: auth.session.id },
      data: { 
        password: hashed,
        session_version: { increment: 1 }
      },
    });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.PASSWORD_CHANGE,
      entityType: "user",
      entityId: auth.session.id,
      request,
    });

    return NextResponse.json({ success: true, message: "Password berhasil diubah" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
