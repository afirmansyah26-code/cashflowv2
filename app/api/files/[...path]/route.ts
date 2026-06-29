import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";
import fs from "fs";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".gif": "image/gif",
};

function isPathInside(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child);
  return (
    relativePath !== "" &&
    !relativePath.startsWith(`..${path.sep}`) &&
    relativePath !== ".." &&
    !path.isAbsolute(relativePath)
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathArray } = await params;
  
  if (!pathArray || pathArray.length === 0) {
    return NextResponse.json({ error: "Path tidak valid" }, { status: 400 });
  }

  const isPublic = pathArray[0] === "public";
  const isPrivate = pathArray[0] === "private";

  if (!isPublic && !isPrivate) {
    return NextResponse.json({ error: "Akses file ditolak" }, { status: 403 });
  }

  // Enforce authentication for private files
  if (isPrivate) {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
  }

  const filename = pathArray[pathArray.length - 1];
  const extension = path.extname(filename).toLowerCase();

  if (
    !filename ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(filename) ||
    filename !== path.basename(filename) ||
    filename.includes("\0") ||
    !MIME_TYPES[extension]
  ) {
    return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
  }

  const baseDirectory = path.resolve(process.cwd(), "storage");
  const filePath = path.resolve(baseDirectory, ...pathArray);

  if (!isPathInside(baseDirectory, filePath)) {
    return NextResponse.json({ error: "Akses file ditolak" }, { status: 403 });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }
    
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME_TYPES[extension],
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("File read error:", error);
    return NextResponse.json({ error: "Gagal membaca file" }, { status: 500 });
  }
}
