import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "month"; // week | month | year

    // Calculate date range based on period
    let dateFormat: string;
    let dateStart: string | null = null;
    const now = new Date();

    if (period === "all") {
      dateFormat = "%Y-%m";
    } else if (period === "week") {
      dateFormat = "%Y-%m-%d";
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateStart = weekAgo.toISOString().split("T")[0];
    } else if (period === "year") {
      dateFormat = "%Y-%m";
      dateStart = `${now.getFullYear()}-01-01`;
    } else {
      // month = last 30 days
      dateFormat = "%Y-%m-%d";
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      dateStart = monthAgo.toISOString().split("T")[0];
    }

    const dateCondition = dateStart
      ? Prisma.sql`AND transaction_date >= ${dateStart}`
      : Prisma.empty;
    const aliasedDateCondition = dateStart
      ? Prisma.sql`AND t.transaction_date >= ${dateStart}`
      : Prisma.empty;

    // Summary totals - filtered by period
    const summaryResult = await prisma.$queryRaw<Array<{ totalIncome: number; totalExpense: number; totalTransactions: number }>>(Prisma.sql`
      SELECT
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense,
        COUNT(*) as totalTransactions
      FROM transactions
      WHERE 1=1
      ${dateCondition}
    `);

    const totalIncome = Number(summaryResult[0]?.totalIncome || 0);
    const totalExpense = Number(summaryResult[0]?.totalExpense || 0);
    const balance = totalIncome - totalExpense;
    const totalTransactions = Number(summaryResult[0]?.totalTransactions || 0);

    // Chart data - transaction trends

    const trendData = await prisma.$queryRaw<Array<{ period: string; income: number; expense: number }>>(Prisma.sql`
      SELECT
        DATE_FORMAT(transaction_date, ${dateFormat}) as period,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE 1=1
      ${dateCondition}
      GROUP BY period
      ORDER BY period ASC
    `);

    // Top expense categories (donut chart) - filtered by period
    const topExpenseCategories = await prisma.$queryRaw<Array<{ name: string; total: Prisma.Decimal }>>(Prisma.sql`
      SELECT c.name, SUM(t.amount) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense'
      ${aliasedDateCondition}
      GROUP BY c.name
      ORDER BY total DESC
      LIMIT 8
    `);

    // Recent transactions - filtered by period
    const recentWhere: Record<string, unknown> = {};
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      recentWhere.transaction_date = { gte: weekAgo };
    } else if (period === "month") {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      recentWhere.transaction_date = { gte: monthAgo };
    } else if (period === "year") {
      recentWhere.transaction_date = { gte: new Date(`${now.getFullYear()}-01-01`) };
    }
    // period === "all" → no date filter

    const recentTransactions = await prisma.transactions.findMany({
      where: recentWhere,
      take: 10,
      orderBy: [{ transaction_date: "desc" }, { id: "desc" }],
      include: { categories: true, users: { select: { username: true } } },
    });

    // Balance movement - filtered by period
    const balanceMovement = await prisma.$queryRaw<Array<{ date: string; balance: number }>>(Prisma.sql`
      SELECT
        DATE_FORMAT(transaction_date, '%Y-%m-%d') as date,
        (SELECT SUM(CASE WHEN t2.type = 'income' THEN t2.amount ELSE -t2.amount END)
         FROM transactions t2
         WHERE t2.transaction_date <= t1.transaction_date) as balance
      FROM (
        SELECT DISTINCT transaction_date
        FROM transactions
        WHERE 1=1
        ${dateCondition}
        ORDER BY transaction_date ASC
      ) t1
      ORDER BY t1.transaction_date ASC
    `);

    return NextResponse.json({
      summary: { totalIncome, totalExpense, balance, totalTransactions },
      trendData: trendData.map((d) => ({
        period: d.period,
        income: Number(d.income),
        expense: Number(d.expense),
      })),
      topExpenseCategories: topExpenseCategories.map((c) => ({
        name: c.name,
        total: Number(c.total),
      })),
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
        category_name: t.categories?.name || t.category || "-",
        username: t.users?.username || "-",
      })),
      balanceMovement: balanceMovement.map((b) => ({
        date: b.date,
        balance: Number(b.balance),
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
