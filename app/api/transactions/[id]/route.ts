import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const txId = parseInt(id);
    const body = await request.json();
    const { category_id, type, amount, transaction_date, note, admin_notes, attachment } = body;

    const existing = await prisma.transactions.findUnique({ where: { id: txId } });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    // Only admin can edit others' transactions
    if (auth.session.role !== "admin" && existing.user_id !== auth.session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.transactions.update({
      where: { id: txId },
      data: {
        category_id: category_id !== undefined ? (category_id ? parseInt(category_id) : null) : undefined,
        type: type || undefined,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        transaction_date: transaction_date ? new Date(transaction_date) : undefined,
        note: note !== undefined ? (note || null) : undefined,
        admin_notes: admin_notes !== undefined ? (admin_notes || null) : undefined,
        attachment: attachment !== undefined ? (attachment || null) : undefined,
      },
    });

    return NextResponse.json({ success: true, transaction: { ...updated, amount: Number(updated.amount) } });
  } catch (error) {
    console.error("Transaction PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const txId = parseInt(id);

    const existing = await prisma.transactions.findUnique({ where: { id: txId } });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (auth.session.role !== "admin" && existing.user_id !== auth.session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.transactions.delete({ where: { id: txId } });

    return NextResponse.json({ success: true, message: "Transaksi berhasil dihapus" });
  } catch (error) {
    console.error("Transaction DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
