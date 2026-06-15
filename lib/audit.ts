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
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  request?: NextRequest;
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
        old_value: oldValue ?? Prisma.DbNull,
        new_value: newValue ?? Prisma.DbNull,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
