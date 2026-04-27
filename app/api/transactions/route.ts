import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "25");
    const search = url.searchParams.get("search") || "";
    const filterType = url.searchParams.get("filter_type") || "";
    const filterCategory = url.searchParams.get("filter_category") || "";
    const dateFrom = url.searchParams.get("date_from") || "";
    const dateTo = url.searchParams.get("date_to") || "";

    const where: Prisma.transactionsWhereInput = {};

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
      where.category_id = parseInt(filterCategory);
    }

    if (dateFrom) {
      where.transaction_date = { ...(where.transaction_date as object || {}), gte: new Date(dateFrom) };
    }

    if (dateTo) {
      where.transaction_date = { ...(where.transaction_date as object || {}), lte: new Date(dateTo) };
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
      transactions: transactions.map((t) => ({
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
      })),
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
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { category_id, type, amount, transaction_date, note, admin_notes, attachment } = body;

    if (!type || !amount || !transaction_date) {
      return NextResponse.json({ error: "Jenis, jumlah, dan tanggal harus diisi" }, { status: 400 });
    }

    const transaction = await prisma.transactions.create({
      data: {
        user_id: auth.session.id,
        category_id: category_id ? parseInt(category_id) : null,
        type,
        amount: parseFloat(amount),
        transaction_date: new Date(transaction_date),
        note: note || null,
        admin_notes: admin_notes || null,
        attachment: attachment || null,
      },
    });

    return NextResponse.json({ success: true, transaction: { ...transaction, amount: Number(transaction.amount) } }, { status: 201 });
  } catch (error) {
    console.error("Transactions POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
