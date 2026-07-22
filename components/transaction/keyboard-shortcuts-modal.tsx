"use client";

import Modal from "@/components/ui/modal";
import KeyboardShortcutList from "@/components/keyboard-shortcut-list";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="sm"
      footer={<button type="button" className="btn btn-secondary" onClick={onClose} autoFocus>Tutup</button>}
    >
      <KeyboardShortcutList />
    </Modal>
  );
}
