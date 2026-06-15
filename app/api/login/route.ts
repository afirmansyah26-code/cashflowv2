import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password harus diisi" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const normalizedUsername = username.toLowerCase().trim();
    const limitCheck = await rateLimit({
      key: `login_${ip}_${normalizedUsername}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!limitCheck.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await prisma.users.findUnique({
      where: { username },
    });

    if (!user || user.deleted_at) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({ error: "Akun belum memiliki password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
    }

    const token = signToken({
      id: user.id,
      role: user.role || "user",
      session_version: user.session_version,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    });

    await createAuditLog({
      userId: user.id,
      action: AUDIT_ACTION.LOGIN,
      entityType: "user",
      entityId: user.id,
      request,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 86400, // 1 day
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
