"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Sparkles, Send, Loader2 } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
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

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opened
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

                // Refresh the dashboard if an action was performed
                if (data.actionPerformed) {
                    router.refresh();
                }
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", content: "Oops! Something went wrong. Try again! 🌱" },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Hmm, I couldn't reach the garden. Check your connection! 🌿" },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Bud's Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-28 right-6 w-80 sm:w-96 z-50 animate-slide-up">
                    <div
                        className="bg-white rounded-2xl shadow-2xl border border-sage-200 overflow-hidden flex flex-col"
                        style={{ maxHeight: "500px" }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-sage-600 to-sage-500 p-4 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-cream-100 overflow-hidden flex items-center justify-center">
                                    <Image
                                        src="/bud.png"
                                        alt="Bud"
                                        width={40}
                                        height={40}
                                        className="object-cover scale-[1.8] translate-y-1"
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">Bud</h3>
                                    <p className="text-sage-200 text-xs flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Your Personal Gardener 🌱
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-cream-50 min-h-[200px]">
                            {/* Welcome message */}
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-cream-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                                    <Image
                                        src="/bud.png"
                                        alt="Bud"
                                        width={32}
                                        height={32}
                                        className="object-cover scale-[1.8] translate-y-0.5"
                                    />
                                </div>
                                <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-sage-100 max-w-[85%]">
                                    <p className="text-sage-700 text-sm">
                                        Howdy there, friend! 🌿 I&apos;m Bud, your personal gardener. Ask me about your
                                        finances or tell me about a purchase!
                                    </p>
                                </div>
                            </div>

                            {/* Message history */}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                                    {msg.role === "assistant" && (
                                        <div className="w-8 h-8 rounded-full bg-cream-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                                            <Image
                                                src="/bud.png"
                                                alt="Bud"
                                                width={32}
                                                height={32}
                                                className="object-cover scale-[1.8] translate-y-0.5"
                                            />
                                        </div>
                                    )}
                                    <div
                                        className={`rounded-2xl p-3 max-w-[85%] ${
                                            msg.role === "user"
                                                ? "bg-sage-500 text-white rounded-tr-sm"
                                                : "bg-white shadow-sm border border-sage-100 rounded-tl-sm"
                                        }`}
                                    >
                                        <p
                                            className={`text-sm whitespace-pre-wrap ${
                                                msg.role === "assistant" ? "text-sage-700" : ""
                                            }`}
                                        >
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-cream-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                                        <Image
                                            src="/bud.png"
                                            alt="Bud"
                                            width={32}
                                            height={32}
                                            className="object-cover scale-[1.8] translate-y-0.5"
                                        />
                                    </div>
                                    <div className="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-sage-100">
                                        <div className="flex items-center gap-2 text-sage-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={sendMessage} className="p-3 border-t border-sage-100 bg-white flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Tell Bud what you spent..."
                                    className="flex-1 px-4 py-2.5 bg-sage-50 rounded-xl text-sm text-sage-900 placeholder:text-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-300"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="p-2.5 bg-sage-500 text-white rounded-xl hover:bg-sage-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bud's Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`fixed bottom-6 right-6 z-50 group transition-all duration-300 ${
                    isOpen ? "scale-90" : "hover:scale-110"
                }`}
            >
                {/* Speech bubble on hover */}
                {isHovered && !isOpen && (
                    <div className="absolute bottom-full right-0 mb-3 animate-fade-in">
                        <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-sage-200 whitespace-nowrap">
                            <p className="text-sm font-medium text-sage-700">Howdy! Need help with your garden? 🌿</p>
                        </div>
                        <div className="absolute -bottom-1.5 right-8 w-3 h-3 bg-white border-r border-b border-sage-200 rotate-45" />
                    </div>
                )}

                {/* Bud Avatar Container */}
                <div className="relative" style={{ width: "80px", height: "80px" }}>
                    {/* Avatar Circle */}
                    <div
                        className={`w-full h-full rounded-full shadow-xl transition-all duration-300 overflow-hidden bg-gradient-to-br from-cream-100 to-sage-100 ${
                            isOpen ? "ring-4 ring-sage-400" : "ring-4 ring-white hover:ring-sage-200"
                        }`}
                    >
                        <Image
                            src="/bud.png"
                            alt="Bud"
                            width={80}
                            height={80}
                            className="object-contain scale-[1.3] translate-y-3"
                            priority
                        />
                    </div>

                    {/* Sparkle indicator - outside overflow-hidden */}
                    {!isOpen && (
                        <div className="absolute -top-1 -right-1 z-10 w-6 h-6 bg-sage-400 rounded-full flex items-center justify-center animate-pulse shadow-md">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                    )}
                </div>
            </button>
        </>
    );
}
