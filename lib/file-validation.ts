export type FileType = "jpg" | "png" | "pdf";

export const ATTACHMENT_FILE_ACCEPT = ".jpg,.jpeg,.png,.pdf";

type AttachmentFileMetadata = {
  name: string;
  type: string;
  size: number;
};

const FILE_TYPE_BY_MIME: Record<string, FileType> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

const FILE_TYPE_BY_EXTENSION: Record<string, FileType> = {
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".png": "png",
  ".pdf": "pdf",
};

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

export function validateAttachmentSelection(file: AttachmentFileMetadata): { valid: boolean; error?: string } {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const extensionType = FILE_TYPE_BY_EXTENSION[extension];
  const mimeType = FILE_TYPE_BY_MIME[file.type.toLowerCase()];

  if (!extensionType || (file.type && (!mimeType || extensionType !== mimeType))) {
    return {
      valid: false,
      error: "Format file tidak didukung. Gunakan JPG, PNG, atau PDF.",
    };
  }

  return validateFileSize(mimeType || extensionType, file.size);
}
