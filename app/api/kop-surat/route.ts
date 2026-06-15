import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = "public/uploads/kop-surat";
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const MAX_SIZE = 2 * 1024 * 1024;

async function saveLogo(file: File): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error("Ukuran file logo maksimal 2MB");
  const ext = path.extname(file.name).toLowerCase() || ".png";
  if (!ALLOWED_EXTS.includes(ext)) throw new Error(`Ekstensi tidak diizinkan: ${ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `kop-logo-${Date.now()}${ext}`;
  await mkdir(path.join(process.cwd(), UPLOAD_DIR), { recursive: true });
  await writeFile(path.join(process.cwd(), UPLOAD_DIR, filename), buffer);
  return `kop-surat/${filename}`;
}

// GET: List all print headers
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const headers = await prisma.print_headers.findMany({
    orderBy: [{ is_default: "desc" }, { name: "asc" }],
  });
  return NextResponse.json({ headers });
}

// POST: Create new print header
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const fd = await req.formData();
    const name = fd.get("name") as string;
    const institution_name = fd.get("institution_name") as string;

    if (!name?.trim() || !institution_name?.trim()) {
      return NextResponse.json({ success: false, error: "Nama dan Nama Lembaga wajib diisi" }, { status: 400 });
    }

    let logoPath: string | null = null;
    const logoFile = fd.get("logo_file") as File | null;
    if (logoFile && logoFile.size > 0) {
      logoPath = await saveLogo(logoFile);
    }

    await prisma.print_headers.create({
      data: {
        name,
        institution_name,
        subtitle: (fd.get("subtitle") as string) || null,
        address: (fd.get("address") as string) || null,
        phone: (fd.get("phone") as string) || null,
        bank_info: (fd.get("bank_info") as string) || null,
        notary_info: (fd.get("notary_info") as string) || null,
        logo: logoPath,
        signer_name: (fd.get("signer_name") as string) || null,
        signer_title: (fd.get("signer_title") as string) || null,
        signer_city: (fd.get("signer_city") as string) || null,
      },
    });

    return NextResponse.json({ success: true, message: "Kop surat berhasil ditambahkan" });
  } catch (error) {
    console.error("Kop surat POST error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
