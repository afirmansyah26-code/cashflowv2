import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { adminUpdateTransactionSchema, transactionIdSchema } from "@/lib/validations/transaction";
import { rateLimit } from "@/lib/rate-limit";
import { unlink } from "fs/promises";
import path from "path";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";

function isPathInside(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

async function deleteAttachmentSafe(attachmentUrl: string | null) {
  if (!attachmentUrl) return;
  try {
    const filename = attachmentUrl.split("/").pop();
    if (!filename) return;
    
    const baseDir = path.resolve(process.cwd(), "storage", "private", "bukti");
    const filepath = path.resolve(baseDir, filename);

    if (!isPathInside(baseDir, filepath)) return;

    await unlink(filepath);
  } catch (err) {
    console.error("Failed to delete attachment:", err);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const limitCheck = await rateLimit({
    key: `tx_${auth.session.id}`,
    limit: 100,
    windowMs: 10 * 60 * 1000,
  });

  if (!limitCheck.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }
  try {
    const { id } = await params;
    const idParsed = transactionIdSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.issues[0].message || "ID tidak valid" }, { status: 400 });
    }
    const txId = idParsed.data;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // For PUT, we currently use adminUpdateTransactionSchema for both admin and staff before Patch 6 role splitting.
    const parsed = adminUpdateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message || "Data tidak valid" }, { status: 400 });
    }

    const { category_id, type, amount, transaction_date, note, admin_notes, attachment } = parsed.data;

    // Validate category exists if provided
    if (category_id) {
      const category = await prisma.categories.findFirst({ 
        where: { 
          id: category_id 
          // deleted_at: null // TODO: Uncomment when soft delete is implemented in Patch 10
        } 
      });
      if (!category) {
        return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
      }
    }

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
        category_id: category_id !== undefined ? (category_id || null) : undefined,
        type: type || undefined,
        amount: amount !== undefined ? amount : undefined,
        transaction_date: transaction_date || undefined,
        note: note !== undefined ? (note || null) : undefined,
        admin_notes: admin_notes !== undefined ? (admin_notes || null) : undefined,
        attachment: attachment !== undefined ? (attachment || null) : undefined,
      },
    });

    if (attachment !== undefined && existing.attachment && existing.attachment !== attachment) {
      await deleteAttachmentSafe(existing.attachment);
    }

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.UPDATE,
      entityType: "transaction",
      entityId: updated.id,
      oldValue: existing,
      newValue: updated,
      request,
    });

    return NextResponse.json({ success: true, transaction: { ...updated, amount: Number(updated.amount) } });
  } catch (error) {
    console.error("Transaction PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const limitCheck = await rateLimit({
    key: `tx_${auth.session.id}`,
    limit: 100,
    windowMs: 10 * 60 * 1000,
  });

  if (!limitCheck.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  try {
    const { id } = await params;
    const idParsed = transactionIdSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.issues[0].message || "ID tidak valid" }, { status: 400 });
    }
    const txId = idParsed.data;

    const existing = await prisma.transactions.findUnique({ where: { id: txId } });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (auth.session.role !== "admin" && existing.user_id !== auth.session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.transactions.delete({ where: { id: txId } });

    if (existing.attachment) {
      await deleteAttachmentSafe(existing.attachment);
    }

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.DELETE,
      entityType: "transaction",
      entityId: existing.id,
      oldValue: existing,
      newValue: null,
      request,
    });

    return NextResponse.json({ success: true, message: "Transaksi berhasil dihapus" });
  } catch (error) {
    console.error("Transaction DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
