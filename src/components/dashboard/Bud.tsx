"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ConfirmRequest {
  id: string;
  name: string;
  args: Record<string, unknown>;
  summary: string;
  resolved?: "confirmed" | "cancelled";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  actions?: { message: string; success: boolean }[];
  confirm?: ConfirmRequest;
}

type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "action"; message: string; success: boolean }
  | { type: "confirm"; id: string; name: string; args: Record<string, unknown>; summary: string }
  | { type: "done"; actionPerformed: boolean }
  | { type: "error"; message: string };

interface BudContextValue {
  open: boolean;
  openBud: (prompt?: string) => void;
  closeBud: () => void;
}

const BudContext = createContext<BudContextValue | null>(null);

export function useBud() {
  const context = useContext(BudContext);
  if (!context) throw new Error("useBud must be used within <BudProvider>");
  return context;
}

const SUGGESTIONS = [
  "How much can I spend on fun this week?",
  "Log $14 lunch at Chipotle",
  "How are my goals doing?",
  "Move $50 from Dining to Groceries",
  "What bills are coming up?",
];

export function BudProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  const openBud = useCallback((prompt?: string) => {
    setInitialPrompt(prompt ?? null);
    setOpen(true);
  }, []);
  const closeBud = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openBud, closeBud }), [open, openBud, closeBud]);

  return (
    <BudContext.Provider value={value}>
      {children}
      <BudSheet open={open} onClose={closeBud} initialPrompt={initialPrompt} onPromptConsumed={() => setInitialPrompt(null)} />
    </BudContext.Provider>
  );
}

export function BudFace({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/bud.svg" alt="" width={40} height={40} className={cn("h-full w-full object-cover", className)} />
  );
}

/** Desktop floating launcher. Mobile uses the header avatar in AppShell. */
export function BudLauncher() {
  const { open, openBud } = useBud();
  return (
    <button
      type="button"
      onClick={() => openBud()}
      aria-label="Open Bud, your money assistant"
      aria-expanded={open}
      className={cn(
        "fixed bottom-6 right-6 z-40 hidden h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-soft shadow-float ring-4 ring-surface transition-transform duration-instant hover:scale-105 focus:outline-none focus-visible:ring-focus lg:flex",
        open && "scale-95 ring-brand",
      )}
    >
      <BudFace />
    </button>
  );
}

function BudSheet({
  open,
  onClose,
  initialPrompt,
  onPromptConsumed,
}: {
  open: boolean;
  onClose: () => void;
  initialPrompt: string | null;
  onPromptConsumed: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  const history = useMemo(
    () => messages.filter((message) => !message.streaming && message.content).map(({ role, content }) => ({ role, content })),
    [messages],
  );

  const send = useCallback(
    async (text: string, confirm?: { id: string; name: string; args: Record<string, unknown> }) => {
      if (busy) return;
      const trimmed = text.trim();
      if (!trimmed && !confirm) return;
      setBusy(true);
      setInput("");

      const assistantId = `a-${Date.now()}`;
      setMessages((current) => [
        ...current,
        ...(trimmed ? [{ id: `u-${Date.now()}`, role: "user" as const, content: trimmed }] : []),
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);

      const patch = (update: (message: Message) => Message) =>
        setMessages((current) => current.map((message) => (message.id === assistantId ? update(message) : message)));

      const controller = new AbortController();
      abortRef.current = controller;
      let actionPerformed = false;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed || undefined, history, confirm }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Bud could not answer right now");
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as StreamEvent;
            if (event.type === "text") {
              patch((message) => ({ ...message, content: message.content + event.delta }));
            } else if (event.type === "action") {
              if (event.success) actionPerformed = true;
              patch((message) => ({ ...message, actions: [...(message.actions ?? []), { message: event.message, success: event.success }] }));
            } else if (event.type === "confirm") {
              patch((message) => ({
                ...message,
                confirm: { id: event.id, name: event.name, args: event.args, summary: event.summary },
              }));
            } else if (event.type === "error") {
              patch((message) => ({ ...message, content: message.content || event.message }));
            } else if (event.type === "done") {
              actionPerformed = actionPerformed || event.actionPerformed;
            }
          }
        }
        patch((message) => ({ ...message, streaming: false, content: message.content || (message.confirm ? "" : "Done.") }));
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          patch((message) => ({
            ...message,
            streaming: false,
            content: message.content || (error instanceof Error ? error.message : "Hmm, I couldn't reach the garden. Check your connection!"),
          }));
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
        if (actionPerformed) router.refresh();
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [busy, history, router],
  );

  useEffect(() => {
    if (open && initialPrompt) {
      onPromptConsumed();
      void send(initialPrompt);
    }
  }, [open, initialPrompt, onPromptConsumed, send]);

  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  const resolveConfirm = (message: Message, decision: "confirmed" | "cancelled") => {
    if (!message.confirm) return;
    const confirm = message.confirm;
    setMessages((current) =>
      current.map((item) => (item.id === message.id && item.confirm ? { ...item, confirm: { ...item.confirm, resolved: decision } } : item)),
    );
    if (decision === "confirmed") {
      void send("", { id: confirm.id, name: confirm.name, args: confirm.args });
    } else {
      setMessages((current) => [
        ...current,
        { id: `a-${Date.now()}`, role: "assistant", content: "No problem, I left everything as it was." },
      ]);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="full"
      title={
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-soft">
            <BudFace />
          </span>
          <span>
            <span className="block text-base font-bold leading-tight">Bud</span>
            <span className="block text-xs font-normal text-ink-muted">Your money gardener</span>
          </span>
        </span>
      }
      contentClassName="flex flex-col px-0 pb-0"
      footer={
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor="bud-message" className="sr-only">
            Message Bud
          </label>
          <input
            id="bud-message"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tell Bud what you spent…"
            enterKeyHint="send"
            autoComplete="off"
            disabled={busy}
            className="min-h-11 flex-1 rounded-xl border border-line bg-surface-sunken px-4 text-base text-ink placeholder:text-ink-muted focus:outline-none focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/40 sm:text-sm"
          />
          <Button type="submit" disabled={!input.trim() || busy} aria-label="Send message" className="px-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </form>
      }
    >
      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <Bubble role="assistant">
          Howdy! I&apos;m Bud. Tell me what you spent, ask what you can afford, or have me move money between envelopes.
        </Bubble>

        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm text-ink-secondary hover:border-brand hover:text-brand-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            {(message.content || message.streaming) && (
              <Bubble role={message.role} streaming={message.streaming && !message.content}>
                {message.content}
              </Bubble>
            )}
            {message.actions?.map((action, index) => (
              <p
                key={index}
                role="status"
                className={cn(
                  "ml-11 inline-flex max-w-[85%] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
                  action.success ? "bg-positive-soft text-positive" : "bg-danger-soft text-danger",
                )}
              >
                {action.success ? "✓" : "!"} {action.message}
              </p>
            ))}
            {message.confirm && (
              <div className="ml-11 max-w-[85%] rounded-2xl border border-warning/40 bg-warning-soft p-3.5" role="group" aria-label="Confirm action">
                <p className="text-sm font-semibold text-ink">{message.confirm.summary}</p>
                {message.confirm.resolved ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    {message.confirm.resolved === "confirmed" ? "Confirmed" : "Cancelled"}
                  </p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => resolveConfirm(message, "confirmed")} disabled={busy}>
                      Yes, do it
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => resolveConfirm(message, "cancelled")} disabled={busy}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </Sheet>
  );
}

function Bubble({ role, children, streaming }: { role: "user" | "assistant"; children: ReactNode; streaming?: boolean }) {
  return (
    <div className={cn("flex gap-3", role === "user" && "justify-end")}>
      {role === "assistant" && (
        <span className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full bg-brand-soft">
          <BudFace />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          role === "user"
            ? "rounded-tr-sm bg-brand text-brand-contrast"
            : "rounded-tl-sm border border-line bg-surface text-ink shadow-card",
        )}
      >
        {streaming ? (
          <span className="inline-flex items-center gap-2 text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Tending the garden…
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function BudButton({ className }: { className?: string }) {
  const { openBud } = useBud();
  return (
    <button
      type="button"
      onClick={() => openBud()}
      aria-label="Chat with Bud"
      className={cn(
        "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-brand-soft ring-2 ring-transparent transition-shadow hover:ring-brand focus:outline-none focus-visible:ring-focus",
        className,
      )}
    >
      <span className="sr-only">
        <MessageCircle aria-hidden="true" />
      </span>
      <BudFace />
    </button>
  );
}
