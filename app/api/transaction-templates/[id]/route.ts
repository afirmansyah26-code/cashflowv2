import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";
import {
  transactionTemplateIdSchema,
  updateTransactionTemplateSchema,
} from "@/lib/validations/transaction-template";

async function getEditableTemplate(id: number, userId: number, isAdmin: boolean) {
  const template = await prisma.transaction_templates.findFirst({
    where: { id, deleted_at: null },
  });
  if (!template) return { error: "Template tidak ditemukan", status: 404 } as const;
  if (!isAdmin && (template.is_global || template.user_id !== userId)) {
    return { error: "Forbidden", status: 403 } as const;
  }
  return { template } as const;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const parsedId = transactionTemplateIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: parsedId.error.issues[0].message }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const parsed = updateTransactionTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const isAdmin = auth.session.role.toLowerCase() === "admin";
    const lookup = await getEditableTemplate(parsedId.data, auth.session.id, isAdmin);
    if ("error" in lookup) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status });
    }

    const data = parsed.data;
    if (!isAdmin && ("is_global" in data || "admin_notes" in data)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (data.category_id) {
      const category = await prisma.categories.findUnique({ where: { id: data.category_id } });
      if (!category) {
        return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
      }
    }

    const updateData: Prisma.transaction_templatesUncheckedUpdateInput = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.category_id !== undefined ? { category_id: data.category_id || null } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.note !== undefined ? { note: data.note || null } : {}),
      ...(data.admin_notes !== undefined && isAdmin ? { admin_notes: data.admin_notes || null } : {}),
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
    };

    if (data.is_global !== undefined && isAdmin) {
      updateData.is_global = data.is_global;
      updateData.user_id = data.is_global ? null : lookup.template.user_id || auth.session.id;
    }

    const updated = await prisma.transaction_templates.update({
      where: { id: lookup.template.id },
      data: updateData,
    });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.UPDATE,
      entityType: "transaction_template",
      entityId: updated.id,
      oldValue: lookup.template,
      newValue: updated,
      request,
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error) {
    console.error("Transaction template PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const parsedId = transactionTemplateIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: parsedId.error.issues[0].message }, { status: 400 });
    }

    const isAdmin = auth.session.role.toLowerCase() === "admin";
    const lookup = await getEditableTemplate(parsedId.data, auth.session.id, isAdmin);
    if ("error" in lookup) {
      return NextResponse.json({ error: lookup.error }, { status: lookup.status });
    }

    const deleted = await prisma.transaction_templates.update({
      where: { id: lookup.template.id },
      data: { deleted_at: new Date() },
    });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.DELETE,
      entityType: "transaction_template",
      entityId: deleted.id,
      oldValue: lookup.template,
      newValue: deleted,
      request,
    });

    return NextResponse.json({ success: true, message: "Template berhasil dihapus" });
  } catch (error) {
    console.error("Transaction template DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
