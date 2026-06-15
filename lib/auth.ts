import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is required");
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface SessionPayload {
  id: number;
  role: string;
  session_version: number;
  username?: string;
}

type AuthSuccess = { ok: true; session: SessionPayload };
type AuthFailure = { ok: false; response: NextResponse };
type AuthResult = AuthSuccess | AuthFailure;

/** Require specific roles. Returns session on success, or a ready-to-return error response. */
export async function requireRole(...roles: string[]): Promise<AuthResult> {
  const session = await getSession();
  if (!session) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!roles.includes(session.role)) return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true, session };
}

/** Require any authenticated session (all roles accepted). */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getSession();
  if (!session) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { ok: true, session };
}

/** Require User (reads from DB to ensure user is active and role is up-to-date) */
export async function requireUser(): Promise<AuthResult> {
  const session = await getSession();
  if (!session) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const user = await prisma.users.findFirst({
    where: {
      id: session.id,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      role: true,
      session_version: true,
    }
  });

  if (!user || user.session_version !== session.session_version) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Override session role with DB role
  session.role = user.role || 'staf';
  session.username = user.username;

  return { ok: true, session };
}

/** Require Admin (reads from DB via requireUser) */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  if (auth.session.role.toLowerCase() !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}

export function signToken(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}
