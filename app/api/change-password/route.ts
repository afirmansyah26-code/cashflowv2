import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
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
      data: { password: hashed },
    });

    return NextResponse.json({ success: true, message: "Password berhasil diubah" });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
