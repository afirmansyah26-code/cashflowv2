import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import { detectFileType, validateFileSize } from "@/lib/file-validation";


const PRIVATE_EVIDENCE_DIRECTORY = path.resolve(process.cwd(), "storage", "private", "bukti");
const PUBLIC_LOGO_DIRECTORY = path.resolve(process.cwd(), "public", "uploads");

const UPLOAD_CONFIG = {
  bukti: {
    directory: PRIVATE_EVIDENCE_DIRECTORY,
    responseBasePath: "/api/files",
  },
  logo: {
    directory: PUBLIC_LOGO_DIRECTORY,
    responseBasePath: "/uploads",
  },
} as const;



type UploadType = keyof typeof UPLOAD_CONFIG;

function isUploadType(value: string): value is UploadType {
  return Object.prototype.hasOwnProperty.call(UPLOAD_CONFIG, value);
}

function isPathInside(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const limitCheck = await rateLimit({
    key: `upload_${auth.session.id}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  if (!limitCheck.allowed) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");
    const uploadTypeValue = formData.get("type");

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "File harus diunggah" }, { status: 400 });
    }

    if (typeof uploadTypeValue !== "string" || !isUploadType(uploadTypeValue)) {
      return NextResponse.json(
        { error: "Tipe upload tidak valid. Gunakan 'bukti' atau 'logo'." },
        { status: 400 }
      );
    }

    const bytes = await fileValue.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedType = detectFileType(buffer);
    if (!detectedType) {
      return NextResponse.json({ error: "Format file tidak valid atau corrupt. Gunakan JPG, PNG, atau PDF yang valid." }, { status: 400 });
    }

    const sizeValidation = validateFileSize(detectedType, buffer.length);
    if (!sizeValidation.valid) {
      return NextResponse.json({ error: sizeValidation.error }, { status: 413 });
    }

    const extension = `.${detectedType}`;
    const uploadType = uploadTypeValue;
    const uploadConfig = UPLOAD_CONFIG[uploadType];
    const uploadDir = uploadConfig.directory;
    const uniqueName = `${randomUUID()}${extension}`;
    const filePath = path.resolve(uploadDir, uniqueName);

    if (!isPathInside(uploadDir, filePath)) {
      return NextResponse.json({ error: "Lokasi upload tidak valid" }, { status: 400 });
    }

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    const publicPath = `${uploadConfig.responseBasePath}/${uniqueName}`;

    return NextResponse.json({ success: true, filename: uniqueName, path: publicPath });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
