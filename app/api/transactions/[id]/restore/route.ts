import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { transactionIdSchema } from "@/lib/validations/transaction";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
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

    if (auth.session.role.toLowerCase() !== "admin" && existing.user_id !== auth.session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.transactions.update({
      where: { id: txId },
      data: {
        deleted_at: null,
        deleted_by: null,
      },
    });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.RESTORE,
      entityType: "transaction",
      entityId: existing.id,
      oldValue: existing,
      newValue: updated,
      request,
    });

    return NextResponse.json({ success: true, message: "Transaksi berhasil dipulihkan" });
  } catch (error) {
    console.error("Restore transaction error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
