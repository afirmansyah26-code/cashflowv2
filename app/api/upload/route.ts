import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploadType = formData.get("type") as string || "bukti"; // bukti | logo

    if (!file) {
      return NextResponse.json({ error: "File harus diunggah" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Format file tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
    const uniqueName = `${uploadType}_${Date.now()}${ext}`;

    const uploadDir = uploadType === "logo"
      ? path.join(process.cwd(), "public", "uploads")
      : path.join(process.cwd(), "public", "uploads", "bukti");

    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    const publicPath = uploadType === "logo"
      ? `/uploads/${uniqueName}`
      : `/uploads/bukti/${uniqueName}`;

    return NextResponse.json({ success: true, filename: uniqueName, path: publicPath });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
