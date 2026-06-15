import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { adminTransactionSchema, transactionSchema, getTransactionsQuerySchema } from "@/lib/validations/transaction";
import { rateLimit } from "@/lib/rate-limit";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    
    // Validate GET params
    const parsedQuery = getTransactionsQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return NextResponse.json({ error: parsedQuery.error.issues[0].message || "Invalid query parameters" }, { status: 400 });
    }

    const { page, limit, search, filter_type: filterType, filter_category: filterCategory, date_from: dateFrom, date_to: dateTo } = parsedQuery.data;

    const where: Prisma.transactionsWhereInput = {
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { note: { contains: search } },
        { admin_notes: { contains: search } },
        { categories: { name: { contains: search } } },
      ];
    }

    if (filterType === "income" || filterType === "expense") {
      where.type = filterType;
    }

    if (filterCategory) {
      where.category_id = filterCategory;
    }

    if (dateFrom) {
      where.transaction_date = { ...(where.transaction_date as object || {}), gte: dateFrom };
    }

    if (dateTo) {
      where.transaction_date = { ...(where.transaction_date as object || {}), lte: dateTo };
    }

    const [transactions, total] = await Promise.all([
      prisma.transactions.findMany({
        where,
        include: {
          categories: { select: { id: true, name: true } },
          users: { select: { username: true } },
        },
        orderBy: [{ transaction_date: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transactions.count({ where }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((t) => {
        const mapped = {
          id: t.id,
          user_id: t.user_id,
          category_id: t.category_id,
          category_name: t.categories?.name || t.category || "-",
          type: t.type,
          amount: Number(t.amount),
          transaction_date: t.transaction_date,
          note: t.note,
          admin_notes: t.admin_notes,
          attachment: t.attachment,
          created_at: t.created_at,
          username: t.users?.username || "-",
        };
        if (auth.session.role.toLowerCase() !== "admin") {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { admin_notes: _admin_notes, ...safeTransaction } = mapped;
          return safeTransaction;
        }
        return mapped;
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Transactions GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
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
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    let parsed;
    if (auth.session.role.toLowerCase() === "admin") {
      parsed = adminTransactionSchema.safeParse(body);
    } else {
      if ('admin_notes' in body) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      parsed = transactionSchema.safeParse(body);
    }
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message || "Data tidak valid" }, { status: 400 });
    }

    const data = parsed.data;
    const admin_notes = 'admin_notes' in data ? (data as { admin_notes?: string | null }).admin_notes : null;
    const { category_id, type, amount, transaction_date, note, attachment } = data;

    // Validate category exists
    if (category_id) {
      const category = await prisma.categories.findFirst({ 
        where: { 
          id: category_id,
          // deleted_at: null // TODO: Uncomment when soft delete is implemented for categories. Currently only transactions have deleted_at
        } 
      });
      if (!category) {
        return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
      }
    }

    const transaction = await prisma.transactions.create({
      data: {
        user_id: auth.session.id,
        category_id: category_id || null,
        type,
        amount,
        transaction_date,
        note: note || null,
        admin_notes: admin_notes || null,
        attachment: attachment || null,
      },
    });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.CREATE,
      entityType: "transaction",
      entityId: transaction.id,
      oldValue: null,
      newValue: transaction,
      request,
    });

    return NextResponse.json({ success: true, transaction: { ...transaction, amount: Number(transaction.amount) } }, { status: 201 });
  } catch (error) {
    console.error("Transactions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
