import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { transactionIdSchema } from "@/lib/validations/transaction";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";
import { unlink } from "fs/promises";
import path from "path";

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
    console.error("Failed to delete attachment during purge:", err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const idParsed = transactionIdSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.issues[0].message || "ID tidak valid" }, { status: 400 });
    }
    const txId = idParsed.data;

    const existing = await prisma.transactions.findFirst({
      where: {
        id: txId,
        deleted_at: { not: null },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaksi di recycle bin tidak ditemukan" }, { status: 404 });
    }

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.PURGE,
      entityType: "transaction",
      entityId: existing.id,
      oldValue: existing,
      newValue: null,
      request,
    });

    await prisma.transactions.delete({ where: { id: txId } });

    if (existing.attachment) {
      await deleteAttachmentSafe(existing.attachment);
    }

    return NextResponse.json({ success: true, message: "Transaksi berhasil dihapus secara permanen" });
  } catch (error) {
    console.error("Purge transaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
