"use client";

import {
  Calculator,
  Delete,
  GripHorizontal,
  RotateCcw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type {
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

type Operator = "+" | "-" | "*" | "/";
type Position = { x: number; y: number };

const POSITION_STORAGE_KEY = "floating-calculator-position";
const PANEL_MARGIN = 12;
const MAX_INPUT_LENGTH = 15;

function subscribeToClientMount() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function getSavedPosition(): Position | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<Position>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    localStorage.removeItem(POSITION_STORAGE_KEY);
  }

  return null;
}

const operatorLabels: Record<Operator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

function calculate(left: number, right: number, operator: Operator) {
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  if (operator === "*") return left * right;
  if (right === 0) return null;
  return left / right;
}

function normalizeResult(value: number) {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round((value + Number.EPSILON) * 1e12) / 1e12;
  return String(rounded);
}

function formatDisplay(value: string) {
  if (value === "Error") return value;

  const [integerPart, decimalPart] = value.split(".");
  const integer = Number(integerPart || "0");
  const formattedInteger = Number.isFinite(integer)
    ? integer.toLocaleString("id-ID", { maximumFractionDigits: 0 })
    : integerPart;

  if (decimalPart !== undefined) return `${formattedInteger},${decimalPart}`;
  return formattedInteger;
}

export default function FloatingCalculator() {
  const mounted = useSyncExternalStore(subscribeToClientMount, getClientSnapshot, getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(getSavedPosition);
  const [display, setDisplay] = useState("0");
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Position | null>(position);
  const keyboardActiveRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const clampPosition = useCallback((next: Position): Position => {
    const panel = panelRef.current;
    if (!panel) return next;

    const maxX = Math.max(PANEL_MARGIN, window.innerWidth - panel.offsetWidth - PANEL_MARGIN);
    const maxY = Math.max(PANEL_MARGIN, window.innerHeight - panel.offsetHeight - PANEL_MARGIN);

    return {
      x: Math.min(Math.max(PANEL_MARGIN, next.x), maxX),
      y: Math.min(Math.max(PANEL_MARGIN, next.y), maxY),
    };
  }, []);

  const updatePosition = useCallback((next: Position) => {
    const clamped = clampPosition(next);
    positionRef.current = clamped;
    setPosition(clamped);
  }, [clampPosition]);

  const savePosition = useCallback(() => {
    if (!positionRef.current) return;
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(positionRef.current));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;

      const next = positionRef.current ?? {
        x: window.innerWidth - panel.offsetWidth - 20,
        y: window.innerHeight - panel.offsetHeight - 20,
      };
      updatePosition(next);
      panel.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const isInsideCalculator = Boolean(
        panelRef.current?.contains(event.target as Node),
      );
      keyboardActiveRef.current = isInsideCalculator;
      setIsKeyboardActive(isInsideCalculator);
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (positionRef.current) updatePosition(positionRef.current);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, updatePosition]);

  const clearAll = () => {
    setDisplay("0");
    setStoredValue(null);
    setPendingOperator(null);
    setWaitingForOperand(false);
  };

  const inputDigit = (digit: string) => {
    if (display === "Error" || waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
      return;
    }

    const digitCount = display.replace(/[-.]/g, "").length;
    if (digitCount >= MAX_INPUT_LENGTH) return;
    setDisplay((current) => current === "0" ? digit : current + digit);
  };

  const inputDecimal = () => {
    if (display === "Error" || waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay((current) => `${current}.`);
  };

  const toggleSign = () => {
    if (display === "Error" || display === "0") return;
    setDisplay((current) => current.startsWith("-") ? current.slice(1) : `-${current}`);
  };

  const applyPercent = () => {
    if (display === "Error") return;
    const result = normalizeResult(Number(display) / 100);
    setDisplay(result ?? "Error");
    setWaitingForOperand(true);
  };

  const backspace = () => {
    if (display === "Error") {
      clearAll();
      return;
    }
    if (waitingForOperand) return;
    setDisplay((current) => current.length <= 1 || (current.length === 2 && current.startsWith("-"))
      ? "0"
      : current.slice(0, -1));
  };

  const chooseOperator = (nextOperator: Operator) => {
    if (display === "Error") {
      clearAll();
      return;
    }

    const inputValue = Number(display);

    if (pendingOperator && storedValue !== null && !waitingForOperand) {
      const rawResult = calculate(storedValue, inputValue, pendingOperator);
      const result = rawResult === null ? null : normalizeResult(rawResult);

      if (result === null) {
        setDisplay("Error");
        setStoredValue(null);
        setPendingOperator(null);
        setWaitingForOperand(true);
        return;
      }

      setDisplay(result);
      setStoredValue(Number(result));
    } else if (storedValue === null) {
      setStoredValue(inputValue);
    }

    setPendingOperator(nextOperator);
    setWaitingForOperand(true);
  };

  const showResult = () => {
    if (display === "Error" || !pendingOperator || storedValue === null || waitingForOperand) return;

    const rawResult = calculate(storedValue, Number(display), pendingOperator);
    const result = rawResult === null ? null : normalizeResult(rawResult);

    setDisplay(result ?? "Error");
    setStoredValue(null);
    setPendingOperator(null);
    setWaitingForOperand(true);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;

    const panel = panelRef.current;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    updatePosition({
      x: event.clientX - drag.offsetX,
      y: event.clientY - drag.offsetY,
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    savePosition();
  };

  const resetPosition = () => {
    const panel = panelRef.current;
    if (!panel) return;

    const next = {
      x: window.innerWidth - panel.offsetWidth - 20,
      y: window.innerHeight - panel.offsetHeight - 20,
    };
    updatePosition(next);
    window.requestAnimationFrame(savePosition);
  };

  const activateKeyboard = () => {
    keyboardActiveRef.current = true;
    setIsKeyboardActive(true);
  };

  const deactivateKeyboard = () => {
    keyboardActiveRef.current = false;
    setIsKeyboardActive(false);
  };

  const openCalculator = () => {
    activateKeyboard();
    setIsOpen(true);
  };

  const closeCalculator = () => {
    deactivateKeyboard();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleCalculatorShortcut = (event: KeyboardEvent) => {
      const isAltK = event.altKey
        && !event.ctrlKey
        && !event.metaKey
        && !event.shiftKey
        && event.code === "KeyK";

      if (!isAltK || event.repeat) return;

      event.preventDefault();
      if (isOpen) {
        keyboardActiveRef.current = false;
        setIsKeyboardActive(false);
        setIsOpen(false);
      } else {
        keyboardActiveRef.current = true;
        setIsKeyboardActive(true);
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleCalculatorShortcut);
    return () => window.removeEventListener("keydown", handleCalculatorShortcut);
  }, [isOpen]);

  const handleFocusOutside = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      deactivateKeyboard();
    }
  };

  const handleCalculatorKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!keyboardActiveRef.current) return;

    const digitMatch = /^Numpad([0-9])$/.exec(event.code);
    let handled = true;

    if (digitMatch) {
      inputDigit(digitMatch[1]);
    } else {
      switch (event.code) {
        case "NumpadDecimal":
        case "NumpadComma":
          inputDecimal();
          break;
        case "NumpadAdd":
          chooseOperator("+");
          break;
        case "NumpadSubtract":
          chooseOperator("-");
          break;
        case "NumpadMultiply":
          chooseOperator("*");
          break;
        case "NumpadDivide":
          chooseOperator("/");
          break;
        case "NumpadEnter":
        case "NumpadEqual":
          showResult();
          break;
        case "Backspace":
          backspace();
          break;
        default:
          handled = false;
      }
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  if (!mounted) return null;

  const expression = storedValue !== null && pendingOperator
    ? `${formatDisplay(String(storedValue))} ${operatorLabels[pendingOperator]}`
    : "Kalkulator";

  return createPortal(
    <div className="floating-calculator-root no-print">
      {isOpen ? (
        <div
          ref={panelRef}
          className={`floating-calculator-panel ${isKeyboardActive ? "floating-calculator-panel-active" : ""}`}
          style={position ? { left: position.x, top: position.y } : { right: 20, bottom: 20 }}
          role="dialog"
          aria-label="Kalkulator"
          tabIndex={-1}
          onFocusCapture={activateKeyboard}
          onBlurCapture={handleFocusOutside}
          onKeyDown={handleCalculatorKeyDown}
        >
          <div
            className="floating-calculator-header"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div className="floating-calculator-title">
              <GripHorizontal size={18} aria-hidden="true" />
              <span>Kalkulator</span>
              <span
                className={`floating-calculator-keyboard-status ${isKeyboardActive ? "floating-calculator-keyboard-status-active" : ""}`}
                role="status"
                aria-label={isKeyboardActive ? "Input NumPad aktif" : "Input NumPad nonaktif"}
                title={isKeyboardActive ? "Input NumPad aktif" : "Klik kalkulator untuk mengaktifkan NumPad"}
              >
                NumPad
              </span>
            </div>
            <div className="floating-calculator-actions">
              <button type="button" onClick={resetPosition} aria-label="Kembalikan posisi kalkulator" title="Kembalikan posisi">
                <RotateCcw size={15} />
              </button>
              <button type="button" onClick={closeCalculator} aria-label="Tutup kalkulator" title="Tutup (Alt+K)">
                <X size={17} />
              </button>
            </div>
          </div>

          <div className="floating-calculator-display" aria-live="polite">
            <div className="floating-calculator-expression">{expression}</div>
            <output title={formatDisplay(display)}>{formatDisplay(display)}</output>
          </div>

          <div className="floating-calculator-keypad">
            <button type="button" className="calculator-key calculator-key-muted" onClick={clearAll}>AC</button>
            <button type="button" className="calculator-key calculator-key-muted" onClick={toggleSign} aria-label="Ubah tanda">±</button>
            <button type="button" className="calculator-key calculator-key-muted" onClick={applyPercent} aria-label="Persen">%</button>
            <button type="button" className={`calculator-key calculator-key-operator ${pendingOperator === "/" ? "calculator-key-active" : ""}`} onClick={() => chooseOperator("/")} aria-label="Bagi">÷</button>

            {["7", "8", "9"].map((digit) => <button type="button" className="calculator-key" key={digit} onClick={() => inputDigit(digit)}>{digit}</button>)}
            <button type="button" className={`calculator-key calculator-key-operator ${pendingOperator === "*" ? "calculator-key-active" : ""}`} onClick={() => chooseOperator("*")} aria-label="Kali">×</button>

            {["4", "5", "6"].map((digit) => <button type="button" className="calculator-key" key={digit} onClick={() => inputDigit(digit)}>{digit}</button>)}
            <button type="button" className={`calculator-key calculator-key-operator ${pendingOperator === "-" ? "calculator-key-active" : ""}`} onClick={() => chooseOperator("-")} aria-label="Kurang">−</button>

            {["1", "2", "3"].map((digit) => <button type="button" className="calculator-key" key={digit} onClick={() => inputDigit(digit)}>{digit}</button>)}
            <button type="button" className={`calculator-key calculator-key-operator ${pendingOperator === "+" ? "calculator-key-active" : ""}`} onClick={() => chooseOperator("+")} aria-label="Tambah">+</button>

            <button type="button" className="calculator-key" onClick={() => inputDigit("0")}>0</button>
            <button type="button" className="calculator-key" onClick={inputDecimal} aria-label="Desimal">,</button>
            <button type="button" className="calculator-key" onClick={backspace} aria-label="Hapus satu digit"><Delete size={19} /></button>
            <button type="button" className="calculator-key calculator-key-equals" onClick={showResult} aria-label="Hasil">=</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="floating-calculator-launcher"
          onClick={openCalculator}
          aria-label="Buka kalkulator"
          title="Buka kalkulator (Alt+K)"
        >
          <Calculator size={24} />
        </button>
      )}
    </div>,
    document.body,
  );
}
