export type FileType = "jpg" | "png" | "pdf";

export function detectFileType(buffer: Buffer): FileType | null {
  // JPG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }

  // PNG: 89 50 4E 47
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "png";
  }

  // PDF: 25 50 44 46 (%PDF)
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "pdf";
  }

  return null;
}

export function validateFileSize(fileType: FileType, size: number): { valid: boolean; error?: string } {
  const MB = 1024 * 1024;
  
  if (fileType === "pdf") {
    if (size > 10 * MB) return { valid: false, error: "Ukuran PDF maksimal 10MB" };
  } else {
    // jpg, png
    if (size > 5 * MB) return { valid: false, error: "Ukuran gambar maksimal 5MB" };
  }

  return { valid: true };
}
