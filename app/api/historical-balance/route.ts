import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("date_from") || "";
    const dateTo = url.searchParams.get("date_to") || "";

    if (dateFrom && !isValidDate(dateFrom)) {
      return NextResponse.json(
        { error: "date_from harus berupa tanggal valid dengan format YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (dateTo && !isValidDate(dateTo)) {
      return NextResponse.json(
        { error: "date_to harus berupa tanggal valid dengan format YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json(
        { error: "date_from tidak boleh lebih besar dari date_to" },
        { status: 400 }
      );
    }

    let dateCondition = Prisma.empty;
    if (dateFrom && dateTo) {
      dateCondition = Prisma.sql`AND t1.transaction_date BETWEEN ${dateFrom} AND ${dateTo}`;
    } else if (dateFrom) {
      dateCondition = Prisma.sql`AND t1.transaction_date >= ${dateFrom}`;
    } else if (dateTo) {
      dateCondition = Prisma.sql`AND t1.transaction_date <= ${dateTo}`;
    }

    // Saldo Awal: sum of all transactions BEFORE the date range
    let saldoAwal = 0;
    if (dateFrom) {
      const saldoAwalResult = await prisma.$queryRaw<Array<{ saldo: number }>>`
        SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as saldo
        FROM transactions
        WHERE transaction_date < ${dateFrom} AND deleted_at IS NULL
      `;
      saldoAwal = Number(saldoAwalResult[0]?.saldo || 0);
    }

    // Daily data within filter range
    const data = await prisma.$queryRaw<Array<{
      date: string;
      daily_income: number;
      daily_expense: number;
      cumulative_balance: number;
    }>>(Prisma.sql`
      SELECT
        DATE_FORMAT(t1.transaction_date, '%Y-%m-%d') as date,
        COALESCE(SUM(CASE WHEN t1.type = 'income' THEN t1.amount ELSE 0 END), 0) as daily_income,
        COALESCE(SUM(CASE WHEN t1.type = 'expense' THEN t1.amount ELSE 0 END), 0) as daily_expense,
        (SELECT COALESCE(SUM(CASE WHEN t2.type = 'income' THEN t2.amount ELSE -t2.amount END), 0)
         FROM transactions t2
         WHERE t2.transaction_date <= t1.transaction_date AND t2.deleted_at IS NULL) as cumulative_balance
      FROM transactions t1
      WHERE t1.deleted_at IS NULL
      ${dateCondition}
      GROUP BY t1.transaction_date
      ORDER BY t1.transaction_date ASC
    `);

    // Calculate summary for the filtered period
    const totalIncome = data.reduce((sum, d) => sum + Number(d.daily_income), 0);
    const totalExpense = data.reduce((sum, d) => sum + Number(d.daily_expense), 0);
    const saldoAkhir = data.length > 0 ? Number(data[data.length - 1].cumulative_balance) : saldoAwal;

    return NextResponse.json({
      summary: {
        saldoAwal,
        totalIncome,
        totalExpense,
        saldoAkhir,
        dateFrom: dateFrom || (data.length > 0 ? data[0].date : ""),
        dateTo: dateTo || (data.length > 0 ? data[data.length - 1].date : ""),
      },
      data: data.map((d) => ({
        date: d.date,
        daily_income: Number(d.daily_income),
        daily_expense: Number(d.daily_expense),
        cumulative_balance: Number(d.cumulative_balance),
      })),
    });
  } catch (error) {
    console.error("Historical balance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
