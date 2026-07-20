"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function BudFace({ size, className = "" }: { size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/bud.svg"
      alt="Bud the gardener"
      width={size}
      height={size}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

export function Bud() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.actionPerformed) {
          router.refresh();
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Oops — something went wrong in the garden. Try again!" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Hmm, I couldn't reach the garden. Check your connection!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-[7.5rem] right-4 z-50 w-[min(100vw-2rem,24rem)] animate-slide-up sm:right-6 lg:bottom-28">
          <div
            className="flex max-h-[min(70dvh,500px)] flex-col overflow-hidden rounded-2xl border border-sage-200 bg-white shadow-2xl"
            role="dialog"
            aria-label="Chat with Bud the gardener"
          >
            <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-sage-600 to-sage-500 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-cream-100 ring-2 ring-white/40">
                  <BudFace size={40} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Bud</h3>
                  <p className="text-xs text-sage-200">Your personal gardener</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-[200px] flex-1 space-y-4 overflow-y-auto bg-cream-50 p-4">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-100">
                  <BudFace size={32} />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-sage-100 bg-white p-3 shadow-sm">
                  <p className="text-sm text-sage-700">
                    Howdy! I&apos;m Bud, your personal gardener. Tell me what you spent or ask about your envelopes,
                    goals, and paycheck plan.
                  </p>
                </div>
              </div>

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-100">
                      <BudFace size={32} />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 ${
                      msg.role === "user"
                        ? "rounded-tr-sm bg-sage-500 text-white"
                        : "rounded-tl-sm border border-sage-100 bg-white shadow-sm"
                    }`}
                  >
                    <p className={`whitespace-pre-wrap text-sm ${msg.role === "assistant" ? "text-sage-700" : ""}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-100">
                    <BudFace size={32} />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-sage-100 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 text-sage-500">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span className="text-sm">Tending the garden...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex-shrink-0 border-t border-sage-100 bg-white p-3">
              <div className="flex items-center gap-2">
                <label htmlFor="bud-message" className="sr-only">
                  Message Bud
                </label>
                <input
                  id="bud-message"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tell Bud what you spent..."
                  className="min-h-11 flex-1 rounded-xl bg-sage-50 px-4 py-2.5 text-sm text-sage-900 placeholder:text-sage-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-sage-500 text-white transition-colors hover:bg-sage-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isOpen ? "Close Bud" : "Open Bud the gardener"}
        aria-expanded={isOpen}
        className={`fixed bottom-[5.5rem] right-4 z-50 transition-all duration-300 sm:bottom-6 sm:right-6 lg:bottom-6 ${
          isOpen ? "scale-90" : "hover:scale-105"
        }`}
      >
        {isHovered && !isOpen && (
          <div className="absolute bottom-full right-0 mb-3 hidden animate-fade-in sm:block">
            <div className="whitespace-nowrap rounded-xl border border-sage-200 bg-white px-4 py-2 shadow-lg">
              <p className="text-sm font-medium text-sage-700">Howdy! Need a hand in the garden?</p>
            </div>
            <div className="absolute -bottom-1.5 right-8 h-3 w-3 rotate-45 border-b border-r border-sage-200 bg-white" />
          </div>
        )}

        <div className="relative h-16 w-16 sm:h-20 sm:w-20">
          <div
            className={`h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-cream-100 to-sage-100 shadow-xl transition-all duration-300 ${
              isOpen ? "ring-4 ring-sage-400" : "ring-4 ring-white hover:ring-sage-200"
            }`}
          >
            <BudFace size={80} />
          </div>
        </div>
      </button>
    </>
  );
}
