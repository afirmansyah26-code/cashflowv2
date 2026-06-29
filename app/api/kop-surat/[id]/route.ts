import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import fs from "fs";
import { createAuditLog, AUDIT_ACTION } from "@/lib/audit";

const UPLOAD_DIR = "storage/public/kop-surat";
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

function isPathInside(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

function deleteLogo(logoPath: string) {
  try {
    const filename = logoPath.split("/").pop();
    if (!filename) return;

    const baseDir = path.resolve(process.cwd(), "storage", "public", "kop-surat");
    const fullPath = path.resolve(baseDir, filename);

    if (!isPathInside(baseDir, fullPath)) return;

    if (fs.existsSync(fullPath)) {
      unlink(fullPath).catch(() => {});
    }
  } catch (err) {
    console.error("Failed to delete logo:", err);
  }
}

// PUT: Update print header
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const existing = await prisma.print_headers.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ success: false, error: "Tidak ditemukan" }, { status: 404 });

    const fd = await req.formData();

    // Handle "set_default" shortcut
    if (fd.get("set_default") === "true") {
      await prisma.print_headers.updateMany({ data: { is_default: false } });
      const updated = await prisma.print_headers.update({ where: { id: Number(id) }, data: { is_default: true } });

      await createAuditLog({
        userId: auth.session.id,
        action: AUDIT_ACTION.SETTING_CHANGE,
        entityType: "print_headers",
        entityId: Number(id),
        oldValue: existing,
        newValue: updated,
        request: req,
      });

      return NextResponse.json({ success: true, message: "Default berhasil diubah" });
    }

    // Handle logo upload
    let logoPath = existing.logo;
    const logoFile = fd.get("logo_file") as File | null;
    if (logoFile && logoFile.size > 0) {
      if (existing.logo) deleteLogo(existing.logo);
      logoPath = await saveLogo(logoFile);
    }

    const name = fd.get("name") as string;
    const institution_name = fd.get("institution_name") as string;
    if (!name?.trim() || !institution_name?.trim()) {
      return NextResponse.json({ success: false, error: "Nama dan Nama Lembaga wajib diisi" }, { status: 400 });
    }

    const updated = await prisma.print_headers.update({
      where: { id: Number(id) },
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

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.SETTING_CHANGE,
      entityType: "print_headers",
      entityId: Number(id),
      oldValue: existing,
      newValue: updated,
      request: req,
    });

    return NextResponse.json({ success: true, message: "Kop surat berhasil diperbarui" });
  } catch (error) {
    console.error("Kop surat PUT error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Delete print header
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const existing = await prisma.print_headers.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ success: false, error: "Tidak ditemukan" }, { status: 404 });

    if (existing.logo) deleteLogo(existing.logo);
    await prisma.print_headers.delete({ where: { id: Number(id) } });

    await createAuditLog({
      userId: auth.session.id,
      action: AUDIT_ACTION.SETTING_CHANGE,
      entityType: "print_headers",
      entityId: Number(id),
      oldValue: existing,
      newValue: null,
      request: req,
    });

    return NextResponse.json({ success: true, message: "Kop surat berhasil dihapus" });
  } catch (error) {
    console.error("Kop surat DELETE error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
