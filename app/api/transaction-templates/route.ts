import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import {
  getTransactionTemplatesQuerySchema,
  transactionTemplateSchema,
} from "@/lib/validations/transaction-template";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsedQuery = getTransactionTemplatesQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: parsedQuery.error.issues[0].message || "Parameter tidak valid" },
        { status: 400 },
      );
    }

    const { page, limit, search, active_only: activeOnly } = parsedQuery.data;
    const isAdmin = auth.session.role.toLowerCase() === "admin";
    const where: Prisma.transaction_templatesWhereInput = {
      deleted_at: null,
      ...(activeOnly === "true" ? { is_active: true } : {}),
      ...(!isAdmin ? {
        OR: [
          { user_id: auth.session.id, is_global: false },
          { is_global: true },
        ],
      } : {}),
    };

    if (search) {
      const searchConditions: Prisma.transaction_templatesWhereInput[] = [
        { name: { contains: search } },
        { categories: { name: { contains: search } } },
      ];
      const normalizedSearch = search.trim().toLowerCase();
      if (["income", "pemasukan", "masuk"].some((term) => term.includes(normalizedSearch) || normalizedSearch.includes(term))) {
        searchConditions.push({ type: "income" });
      }
      if (["expense", "pengeluaran", "keluar"].some((term) => term.includes(normalizedSearch) || normalizedSearch.includes(term))) {
        searchConditions.push({ type: "expense" });
      }

      if (where.OR) {
        const accessConditions = where.OR;
        delete where.OR;
        where.AND = [{ OR: accessConditions }, { OR: searchConditions }];
      } else {
        where.OR = searchConditions;
      }
    }

    const [templates, total] = await Promise.all([
      prisma.transaction_templates.findMany({
        where,
        include: {
          categories: { select: { name: true } },
          users: { select: { username: true } },
        },
        orderBy: [{ is_global: "desc" }, { name: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction_templates.count({ where }),
    ]);

    return NextResponse.json({
      templates: templates.map((template) => ({
        id: template.id,
        user_id: template.user_id,
        name: template.name,
        type: template.type,
        category_id: template.category_id,
        category_name: template.categories?.name || "-",
        amount: template.amount === null ? null : Number(template.amount),
        note: template.note,
        ...(isAdmin ? { admin_notes: template.admin_notes } : {}),
        is_global: template.is_global,
        is_active: template.is_active,
        owner_name: template.users?.username || (template.is_global ? "Global" : "-"),
        can_edit: isAdmin || (!template.is_global && template.user_id === auth.session.id),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Transaction templates GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const limitCheck = await rateLimit({
    key: `transaction_template_${auth.session.id}`,
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = transactionTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message || "Data template tidak valid" },
        { status: 400 },
      );
    }

    const isAdmin = auth.session.role.toLowerCase() === "admin";
    const data = parsed.data;
    if (data.is_global && !isAdmin) {
      return NextResponse.json({ error: "Hanya Admin yang dapat membuat template global" }, { status: 403 });
    }
    if (!isAdmin && data.admin_notes) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (data.category_id) {
      const category = await prisma.categories.findUnique({ where: { id: data.category_id } });
      if (!category) {
        return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
      }
    }

    const template = await prisma.transaction_templates.create({
      data: {
        user_id: data.is_global ? null : auth.session.id,
        name: data.name,
        type: data.type,
        category_id: data.category_id || null,
        amount: data.amount,
        note: data.note || null,
        admin_notes: isAdmin ? data.admin_notes || null : null,
        is_global: data.is_global,
        is_active: data.is_active,
      },
    });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.CREATE,
      entityType: "transaction_template",
      entityId: template.id,
      oldValue: null,
      newValue: template,
      request,
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    console.error("Transaction templates POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
