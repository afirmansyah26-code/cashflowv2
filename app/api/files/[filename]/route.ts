import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/auth";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
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
  { params }: { params: Promise<{ filename: string }> }
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { filename } = await params;
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

  const privateDirectory = path.resolve(process.cwd(), "storage", "private", "bukti");
  const filePath = path.resolve(privateDirectory, filename);

  if (!isPathInside(privateDirectory, filePath)) {
    return NextResponse.json({ error: "Akses file ditolak" }, { status: 403 });
  }

  try {
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME_TYPES[extension],
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
    }

    console.error("Private file read error:", error);
    return NextResponse.json({ error: "Gagal membaca file" }, { status: 500 });
  }
}
