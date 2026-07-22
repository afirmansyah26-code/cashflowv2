"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import TransactionModal from "./transaction-modal";
import KeyboardShortcutsModal from "./keyboard-shortcuts-modal";
import type { OpenTransactionOptions, TransactionRecord } from "./types";

type GlobalTransactionModalState =
  | { mode: "create"; transaction?: never }
  | { mode: "duplicate"; transaction: TransactionRecord };

interface TransactionModalContextValue {
  openTransaction: (options?: OpenTransactionOptions) => void;
  openShortcutHelp: () => void;
  transactionRevision: number;
  notifyTransactionChanged: () => void;
}

const TransactionModalContext = createContext<TransactionModalContextValue | null>(null);

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function TransactionModalProvider({ children }: { children: ReactNode }) {
  const [transactionModal, setTransactionModal] = useState<GlobalTransactionModalState | null>(null);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [transactionRevision, setTransactionRevision] = useState(0);

  const openTransaction = useCallback((options?: OpenTransactionOptions) => {
    if (options?.mode === "duplicate") {
      setTransactionModal({ mode: "duplicate", transaction: options.transaction });
      return;
    }
    setTransactionModal({ mode: "create" });
  }, []);
  const openShortcutHelp = useCallback(() => setIsShortcutHelpOpen(true), []);
  const closeTransactionModal = useCallback(() => setTransactionModal(null), []);
  const closeShortcutHelp = useCallback(() => setIsShortcutHelpOpen(false), []);
  const notifyTransactionChanged = useCallback(() => {
    setTransactionRevision((revision) => revision + 1);
  }, []);

  useEffect(() => {
    const handleOpenShortcut = (event: KeyboardEvent) => {
      const isHelpShortcut = !event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && event.key === "?";
      const isAltN = event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && !event.shiftKey
        && event.key.toLowerCase() === "n";

      if ((!isAltN && !isHelpShortcut) || isEditableTarget(event.target)) return;
      if (transactionModal || isShortcutHelpOpen || document.querySelector(".modal-overlay")) return;

      event.preventDefault();
      if (isHelpShortcut) openShortcutHelp();
      else openTransaction();
    };

    window.addEventListener("keydown", handleOpenShortcut);
    return () => window.removeEventListener("keydown", handleOpenShortcut);
  }, [transactionModal, isShortcutHelpOpen, openShortcutHelp, openTransaction]);

  const value = useMemo(() => ({
    openTransaction,
    openShortcutHelp,
    transactionRevision,
    notifyTransactionChanged,
  }), [openTransaction, openShortcutHelp, transactionRevision, notifyTransactionChanged]);

  return (
    <TransactionModalContext.Provider value={value}>
      {children}
      <TransactionModal
        isOpen={Boolean(transactionModal)}
        mode={transactionModal?.mode || "create"}
        onClose={closeTransactionModal}
        onSaved={notifyTransactionChanged}
        transaction={transactionModal?.mode === "duplicate" ? transactionModal.transaction : undefined}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutHelpOpen}
        onClose={closeShortcutHelp}
      />
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  const context = useContext(TransactionModalContext);
  if (!context) {
    throw new Error("useTransactionModal harus digunakan di dalam TransactionModalProvider");
  }
  return context;
}
