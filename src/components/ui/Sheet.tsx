"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Sticky footer, typically the primary action. */
  footer?: ReactNode;
  /** Desktop width. `full` also makes the mobile sheet take the whole viewport. */
  size?: "sm" | "md" | "lg" | "full";
  /** Hide the visible title while keeping it for assistive tech. */
  hideTitle?: boolean;
  /** Prevent closing on backdrop tap / Escape (e.g. while saving). */
  locked?: boolean;
  className?: string;
  contentClassName?: string;
  headerAccessory?: ReactNode;
}

const desktopWidths = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  full: "sm:max-w-4xl",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const CLOSE_MS = 180;
const DISMISS_DISTANCE = 110;

let openSheets = 0;

/**
 * Accessible dialog that renders as a draggable bottom sheet on phones and a
 * centered dialog on larger screens. Traps focus, restores it on close, locks
 * body scroll, closes on Escape/backdrop, and respects safe areas.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  hideTitle,
  locked,
  className,
  contentClassName,
  headerAccessory,
}: SheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);
  const dragging = useRef(false);

  const requestClose = useCallback(() => {
    if (locked) return;
    onCloseRef.current();
  }, [locked]);

  // Mount/unmount with exit animation.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setDragY(0);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  // Focus management, scroll lock, keyboard.
  useEffect(() => {
    if (!mounted || closing) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    openSheets += 1;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFrame = requestAnimationFrame(() => {
      const target =
        contentRef.current?.querySelector<HTMLElement>("[data-autofocus]") ||
        contentRef.current?.querySelector<HTMLElement>(FOCUSABLE) ||
        dialogRef.current;
      target?.focus({ preventScroll: true });
    });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKey);
      openSheets = Math.max(0, openSheets - 1);
      if (openSheets === 0) document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, [mounted, closing, requestClose]);

  // Drag-to-dismiss (touch only, from the header/handle).
  const onTouchStart = (event: ReactTouchEvent) => {
    if (locked) return;
    dragStart.current = event.touches[0].clientY;
    dragging.current = true;
  };
  const onTouchMove = (event: ReactTouchEvent) => {
    if (!dragging.current || dragStart.current == null) return;
    const delta = event.touches[0].clientY - dragStart.current;
    if (delta > 0) setDragY(delta);
  };
  const onTouchEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > DISMISS_DISTANCE) {
      setDragY(0);
      requestClose();
    } else {
      setDragY(0);
    }
    dragStart.current = null;
  };

  if (!mounted || typeof document === "undefined") return null;

  const isFull = size === "full";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4",
        closing ? "pointer-events-none" : "",
      )}
      role="presentation"
    >
      <div
        className={cn(
          "absolute inset-0 bg-overlay/50 backdrop-blur-sm transition-opacity duration-instant",
          closing ? "opacity-0" : "opacity-100 animate-fade-in",
        )}
        onClick={requestClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        className={cn(
          "relative flex w-full flex-col bg-surface text-ink shadow-sheet outline-none",
          "rounded-t-3xl sm:rounded-2xl sm:shadow-float",
          isFull ? "h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-2rem)]" : "max-h-[92dvh] sm:max-h-[calc(100dvh-2rem)]",
          desktopWidths[size],
          closing
            ? "translate-y-full opacity-100 transition-transform duration-instant ease-in sm:translate-y-4 sm:opacity-0 sm:transition-all"
            : "animate-sheet-in sm:animate-dialog-in",
          isFull && "rounded-t-none sm:rounded-2xl",
          className,
        )}
      >
        <div
          className="flex-none touch-pan-y select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          <div className={cn("flex justify-center pt-3 sm:hidden", isFull && "pt-safe")}>
            <span className="h-1.5 w-12 rounded-full bg-line-strong" aria-hidden="true" />
          </div>
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-3 sm:pt-5">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className={cn("text-lg font-bold leading-tight text-ink", hideTitle && "sr-only")}>
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            {headerAccessory}
            <IconButton label="Close" onClick={requestClose} variant="ghost" size="sm" className="-mr-2 -mt-1">
              <X />
            </IconButton>
          </div>
        </div>

        <div
          ref={contentRef}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5",
            !footer && "pb-safe",
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="flex-none border-t border-line bg-surface px-5 pb-safe pt-3 sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Backwards-compatible wrapper used by legacy components. */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Sheet open={isOpen} onClose={onClose} title={title} className={className}>
      {children}
    </Sheet>
  );
}
