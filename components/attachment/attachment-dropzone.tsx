"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import {
  ATTACHMENT_FILE_ACCEPT,
  validateAttachmentSelection,
} from "@/lib/file-validation";

interface AttachmentDropzoneProps {
  file: File | null;
  disabled?: boolean;
  uploading?: boolean;
  onFileSelect: (file: File) => void;
  onValidationError: (message: string) => void;
}

export default function AttachmentDropzone({
  file,
  disabled = false,
  uploading = false,
  onFileSelect,
  onValidationError,
}: AttachmentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);

  const selectFile = (nextFile?: File) => {
    if (!nextFile || disabled) return;
    const validation = validateAttachmentSelection(nextFile);
    if (!validation.valid) {
      onValidationError(validation.error || "File tidak valid.");
      return;
    }
    onFileSelect(nextFile);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDragEnter = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (disabled) return;
    dragDepthRef.current += 1;
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (disabled) return;
    if (event.dataTransfer.files.length > 1) {
      onValidationError("Hanya satu lampiran yang dapat dipilih.");
      return;
    }
    selectFile(event.dataTransfer.files[0]);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_FILE_ACCEPT}
        onChange={handleInputChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        className={`attachment-dropzone ${dragActive ? "attachment-dropzone-active" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        aria-label={file ? `Ganti lampiran ${file.name}` : "Pilih atau letakkan lampiran transaksi"}
      >
        {uploading ? (
          <LoaderCircle className="attachment-upload-spinner" size={24} aria-hidden="true" />
        ) : (
          <FileUp size={24} aria-hidden="true" />
        )}
        <span className="attachment-dropzone-copy">
          <strong>{uploading ? "Mengunggah lampiran..." : dragActive ? "Lepaskan file di sini" : file ? "Ganti lampiran" : "Pilih atau letakkan file"}</strong>
          <small>JPG/PNG maks. 5 MB · PDF maks. 10 MB</small>
        </span>
      </button>
    </div>
  );
}
