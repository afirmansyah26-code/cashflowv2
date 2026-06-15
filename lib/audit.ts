import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const AUDIT_ACTION = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
  LOGIN: "LOGIN",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  SETTING_CHANGE: "SETTING_CHANGE",
} as const;

export type AuditActionType = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION];

interface CreateAuditLogParams {
  userId?: number | null;
  action: AuditActionType;
  entityType: string;
  entityId?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValue?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue?: any;
  request?: NextRequest;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeAuditValue(value: any): any {
  if (value === null || value === undefined) return value;
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (Prisma.Decimal.isDecimal(value)) {
    return value.toString();
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeAuditValue);
  }
  
  if (typeof value === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitized: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = sanitizeAuditValue(value[key]);
      }
    }
    return sanitized;
  }
  
  return value;
}

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  oldValue,
  newValue,
  request,
}: CreateAuditLogParams) {
  try {
    let ipAddress = "unknown";
    let userAgent = "unknown";

    if (request) {
      ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
      userAgent = request.headers.get("user-agent") || "unknown";
    }

    await prisma.audit_logs.create({
      data: {
        user_id: userId ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        old_value: oldValue === null ? Prisma.DbNull : (sanitizeAuditValue(oldValue) ?? Prisma.DbNull),
        new_value: newValue === null ? Prisma.DbNull : (sanitizeAuditValue(newValue) ?? Prisma.DbNull),
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
