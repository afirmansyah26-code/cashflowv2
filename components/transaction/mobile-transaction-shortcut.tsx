"use client";

import { Plus } from "lucide-react";
import { useTransactionModal } from "./transaction-modal-provider";

export default function MobileTransactionShortcut() {
  const { openTransaction } = useTransactionModal();

  return (
    <button
      type="button"
      className="mobile-transaction-shortcut no-print"
      onClick={() => openTransaction()}
      aria-label="Tambah transaksi"
    >
      <Plus size={18} />
      <span>Transaksi</span>
    </button>
  );
}
