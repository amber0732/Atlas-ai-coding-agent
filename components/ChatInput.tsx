"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Loader2, Paperclip } from "lucide-react";

export interface ChatInputProps {
  isLoading?: boolean;
  isStreaming?: boolean;
  onSubmit: (prompt: string) => Promise<boolean | void> | void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

/**
 * ChatInput component featuring zero-CLS crossfade transition to a looping
 * bot mascot animation during query processing.
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  isLoading: propIsLoading,
  isStreaming: propIsStreaming,
  onSubmit,
  placeholder = "Ask Atlas AI anything...",
  className = "",
  initialValue = "",
}) => {
  const isLoading = propIsLoading ?? propIsStreaming ?? false;
  const [query, setQuery] = useState<string>(initialValue);
  const lastSubmittedQueryRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevLoadingRef = useRef<boolean>(isLoading);

  // Play video smoothly when entering loading state
  useEffect(() => {
    if (isLoading && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy handled gracefully via muted + playsInline
      });
    }
  }, [isLoading]);

  // Automatically restore focus to textarea when loading finishes
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;

    lastSubmittedQueryRef.current = trimmed;
    // Clear query immediately for smooth UX, but retain backup in ref
    setQuery("");

    try {
      const result = await onSubmit(trimmed);
      // If consumer explicitly returned false to indicate failure, restore unsent query
      if (result === false) {
        setQuery(lastSubmittedQueryRef.current);
      }
    } catch (err) {
      // Restore unsent query on submission error
      setQuery(lastSubmittedQueryRef.current);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={`relative w-full min-h-[120px] rounded-2xl bg-[#0b0f19] border border-slate-800 p-3 overflow-hidden shadow-2xl transition-all duration-300 ${className}`}
    >
      {/* Textarea View */}
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder={placeholder}
        aria-label="Chat Prompt Input"
        className={`w-full h-full min-h-[90px] bg-transparent text-white placeholder-slate-400 resize-none outline-none transition-opacity duration-300 font-sans text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 ${
          isLoading ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      />

      {/* Thinking Video Overlay */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center bg-[#0b0f19]/95 backdrop-blur-sm transition-opacity duration-300 z-20 ${
          isLoading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!isLoading}
      >
        {/* Subtle Ambient Glowing Aura matching Bot's Cyan/Purple Aura */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-indigo-500/15 to-purple-500/10 rounded-2xl pointer-events-none animate-pulse" />

        <video
          ref={videoRef}
          src="/assets/bot-thinking.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="relative z-10 w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(77,166,255,0.35)]"
        >
          <source src="/assets/bot-thinking.mp4" type="video/mp4" />
        </video>
        <span className="relative z-10 mt-1 text-xs font-medium text-blue-400/80 tracking-wide animate-pulse font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
          Atlas is thinking...
        </span>
      </div>
    </div>
  );
};

export default ChatInput;
