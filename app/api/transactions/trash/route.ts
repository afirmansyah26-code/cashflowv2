import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getTrashTransactionsQuerySchema } from "@/lib/validations/transaction";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsedQuery = getTrashTransactionsQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: parsedQuery.error.issues[0].message || "Parameter filter tidak valid" },
        { status: 400 },
      );
    }

    const {
      page,
      limit,
      search,
      filter_type: filterType,
      filter_category: filterCategory,
      date_from: dateFrom,
      date_to: dateTo,
    } = parsedQuery.data;
    const isAdmin = auth.session.role.toLowerCase() === "admin";

    const where: Prisma.transactionsWhereInput = {
      deleted_at: { not: null },
      ...(!isAdmin ? { user_id: auth.session.id } : {}),
    };

    if (search) {
      const searchConditions: Prisma.transactionsWhereInput[] = [
        { note: { contains: search } },
        { categories: { name: { contains: search } } },
      ];

      if (isAdmin) {
        searchConditions.push(
          { admin_notes: { contains: search } },
          { users: { username: { contains: search } } },
          { deleted_by_user: { username: { contains: search } } },
        );
      }

      const normalizedNumber = search
        .trim()
        .replace(/^rp\s*/i, "")
        .replace(/[.\s]/g, "")
        .replace(",", ".");

      if (/^\d+(?:\.\d+)?$/.test(normalizedNumber)) {
        const numericSearch = Number(normalizedNumber);
        if (Number.isFinite(numericSearch) && numericSearch >= 0 && numericSearch <= 999999999999.99) {
          searchConditions.push({ amount: numericSearch });
          if (Number.isSafeInteger(numericSearch) && numericSearch > 0 && numericSearch <= 2147483647) {
            searchConditions.push({ id: numericSearch });
          }
        }
      }

      where.OR = searchConditions;
    }

    if (filterType === "income" || filterType === "expense") where.type = filterType;
    if (filterCategory) where.category_id = filterCategory;
    if (dateFrom || dateTo) {
      where.transaction_date = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.transactions.findMany({
        where,
        include: {
          categories: { select: { name: true } },
          users: { select: { username: true } },
          deleted_by_user: { select: { username: true } },
        },
        orderBy: [{ deleted_at: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transactions.count({ where }),
    ]);

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        transaction_date: transaction.transaction_date,
        category_name: transaction.categories?.name || transaction.category || "-",
        note: transaction.note,
        username: transaction.users?.username || "-",
        deleted_at: transaction.deleted_at,
        deleted_by: transaction.deleted_by_user?.username || "-",
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Trash list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
