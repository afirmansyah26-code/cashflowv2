const shortcuts = [
  { keys: ["Alt", "N"], description: "Tambah Transaksi" },
  { keys: ["Alt", "K"], description: "Buka/Tutup Kalkulator" },
  { keys: ["Ctrl", "S"], description: "Simpan" },
  { keys: ["Esc"], description: "Tutup Modal" },
];

export default function KeyboardShortcutList() {
  return (
    <dl className="keyboard-shortcut-list">
      {shortcuts.map((shortcut) => (
        <div className="keyboard-shortcut-row" key={shortcut.description}>
          <dt className="keyboard-shortcut-keys">
            {shortcut.keys.map((key, index) => (
              <span key={key}>
                {index > 0 && <span className="keyboard-shortcut-plus">+</span>}
                <kbd className="shortcut-key">{key}</kbd>
              </span>
            ))}
          </dt>
          <dd>{shortcut.description}</dd>
        </div>
      ))}
    </dl>
  );
}
