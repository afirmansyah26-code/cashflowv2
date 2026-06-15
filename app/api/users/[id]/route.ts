import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const userId = parseInt(id);
    const { username, password, role } = await request.json();

    const existing = await prisma.users.findUnique({ where: { id: userId } });
    if (!existing || existing.deleted_at) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const data: { username?: string; password?: string; role?: "admin" | "staf"; session_version?: { increment: number } } = {};

    if (username && username !== existing.username) {
      const dup = await prisma.users.findUnique({ where: { username } });
      if (dup) return NextResponse.json({ error: "Username sudah digunakan" }, { status: 400 });
      data.username = username;
    }

    if (password) {
      if (password.length < 6) return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
      data.password = await bcrypt.hash(password, 12);
      data.session_version = { increment: 1 };
    }

    if (role) {
      data.role = role === "admin" ? "admin" : "staf";
    }

    const updated = await prisma.users.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, role: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("User PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const userId = parseInt(id);

    if (userId === auth.session.id) {
      return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
    }

    await prisma.users.update({
      where: { id: userId },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ success: true, message: "User berhasil dihapus" });
  } catch (error) {
    console.error("User DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
