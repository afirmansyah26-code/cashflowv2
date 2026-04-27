import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is required");
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface SessionPayload {
  id: number;
  role: string;
  username: string;
  full_name?: string;
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
