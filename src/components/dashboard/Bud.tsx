"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Sparkles } from "lucide-react";

export function Bud() {
    const [isOpen, setIsOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <>
            {/* Bud's Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-28 right-6 w-80 sm:w-96 z-50 animate-slide-up">
                    <div className="bg-white rounded-2xl shadow-2xl border border-sage-200 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-sage-600 to-sage-500 p-4 flex items-center justify-between">
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

                        {/* Chat Content */}
                        <div className="p-4 min-h-[200px] bg-cream-50">
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
                                    <p className="text-sage-700 text-sm">Howdy there, friend! 🌿</p>
                                    <p className="text-sage-600 text-sm mt-2">
                                        I&apos;m Bud, your personal gardener! I&apos;m still getting my tools ready, but
                                        soon I&apos;ll be able to help you manage your finances with just a few words!
                                    </p>
                                    <p className="text-sage-500 text-xs mt-3 italic">
                                        Coming soon: Just tell me what you spent, and I&apos;ll plant it right in your
                                        garden! 🌱
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Coming Soon Input */}
                        <div className="p-3 border-t border-sage-100 bg-white">
                            <div className="flex items-center gap-2 p-3 bg-sage-50 rounded-xl text-sage-400 text-sm">
                                <Sparkles className="w-4 h-4" />
                                <span>AI features coming soon...</span>
                            </div>
                        </div>
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
