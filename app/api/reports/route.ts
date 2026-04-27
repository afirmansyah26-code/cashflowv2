import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const month = url.searchParams.get("month") || "";
    const year = url.searchParams.get("year") || String(new Date().getFullYear());
    const filterType = url.searchParams.get("filter_type") || "";
    const filterCategory = url.searchParams.get("filter_category") || "";

    const where: Prisma.transactionsWhereInput = {};

    // Date filters
    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0); // last day of month
      where.transaction_date = { gte: startDate, lte: endDate };
    } else if (year) {
      const y = parseInt(year);
      where.transaction_date = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) };
    }

    if (filterType === "income" || filterType === "expense") {
      where.type = filterType;
    }

    if (filterCategory) {
      where.category_id = parseInt(filterCategory);
    }

    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        categories: { select: { name: true } },
        users: { select: { username: true } },
      },
      orderBy: [{ transaction_date: "asc" }, { id: "asc" }],
    });

    // Aggregates
    const incomeTotal = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenseTotal = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Category breakdown
    const categoryBreakdown: Record<string, { income: number; expense: number }> = {};
    for (const t of transactions) {
      const catName = t.categories?.name || t.category || "Tanpa Kategori";
      if (!categoryBreakdown[catName]) categoryBreakdown[catName] = { income: 0, expense: 0 };
      categoryBreakdown[catName][t.type] += Number(t.amount);
    }

    // Organization profile for header
    const org = await prisma.organization_profile.findFirst();

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        transaction_date: t.transaction_date,
        category_name: t.categories?.name || t.category || "-",
        note: t.note,
        admin_notes: t.admin_notes,
        username: t.users?.username || "-",
      })),
      summary: { incomeTotal, expenseTotal, balance: incomeTotal - expenseTotal, count: transactions.length },
      categoryBreakdown: Object.entries(categoryBreakdown).map(([name, data]) => ({
        name,
        income: data.income,
        expense: data.expense,
      })),
      organization: org
        ? { name: org.name, subtitle: org.subtitle, address: org.address, logo_path: org.logo_path }
        : null,
    });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
