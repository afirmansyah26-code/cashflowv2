import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Basic database connection check
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      prisma: 'active',
      version: process.env.npm_package_version || 'v2.2',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      prisma: 'error',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
