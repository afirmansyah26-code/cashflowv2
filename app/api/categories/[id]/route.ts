import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama kategori harus diisi" }, { status: 400 });
    }

    const categoryId = parseInt(id);
    const existing = await prisma.categories.findUnique({ where: { id: categoryId } });
    if (!existing) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });

    const updated = await prisma.categories.update({
      where: { id: categoryId },
      data: { name: name.trim() },
    });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.UPDATE,
      entityType: "category",
      entityId: categoryId,
      oldValue: existing,
      newValue: updated,
      request,
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    console.error("Category PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const categoryId = parseInt(id);
    const existing = await prisma.categories.findUnique({ where: { id: categoryId } });
    if (!existing) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });

    await prisma.categories.delete({ where: { id: categoryId } });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.DELETE,
      entityType: "category",
      entityId: categoryId,
      oldValue: existing,
      newValue: null,
      request,
    });

    return NextResponse.json({ success: true, message: "Kategori berhasil dihapus" });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
