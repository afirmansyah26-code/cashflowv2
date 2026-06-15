import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limitParams = parseInt(url.searchParams.get("limit") || "10");
    const limit = limitParams > 100 ? 100 : limitParams;
    const skip = (page - 1) * limit;

    const where = {
      deleted_at: { not: null },
    };

    const transactions = await prisma.transactions.findMany({
      where,
      include: {
        categories: { select: { name: true } },
        users: { select: { username: true } },
        deleted_by_user: { select: { username: true } },
      },
      orderBy: { deleted_at: "desc" },
      skip,
      take: limit,
    });

    const total = await prisma.transactions.count({ where });

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
        deleted_at: t.deleted_at,
        deleted_by: t.deleted_by_user?.username || "-",
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
