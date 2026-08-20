"use client";

import React, { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Paperclip, Send, Loader2 } from "lucide-react";
import { AtlasBotAvatar } from "@/components/AtlasBotAvatar";

/**
 * Interface definition for the WorkspaceInput component.
 * @param isStreaming - Boolean dictating active streaming state.
 * @param isLoading - Optional alias for isStreaming.
 * @param onSubmit - Callback function executing the prompt transmission.
 * @param onError - Optional error callback to restore query.
 */
export interface WorkspaceInputProps {
  isStreaming?: boolean;
  isLoading?: boolean;
  onSubmit: (prompt: string) => Promise<boolean | void> | void;
  onError?: (error: Error) => void;
  placeholder?: string;
  className?: string;
}

/**
 * WorkspaceInput: A high-performance, glassmorphic command interface with
 * seamless zero-CLS crossfade to a looping bot mascot animation during processing.
 */
export const WorkspaceInput: React.FC<WorkspaceInputProps> = ({ 
  isStreaming: propIsStreaming,
  isLoading: propIsLoading,
  onSubmit,
  onError,
  placeholder = "Ask anything, paste code, or describe an issue... (Press Enter to submit, Shift+Enter for new line)",
  className = ""
}) => {
  const isLoading = propIsLoading ?? propIsStreaming ?? false;
  const [input, setInput] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  
  const lastSubmittedInputRef = useRef<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevLoadingRef = useRef<boolean>(isLoading);

  // Smoothly trigger video playback on loading state activation
  useEffect(() => {
    if (isLoading && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Handled silently via muted + playsInline attributes
      });
    }
  }, [isLoading]);

  // Zero-lag focus restoration when AI generation completes or errors out
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 600);
  };

  const handleExecuteSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    lastSubmittedInputRef.current = trimmed;
    setInput("");
    setIsTyping(false);

    try {
      const res = await onSubmit(trimmed);
      if (res === false) {
        // Consumer signalled failure -> restore unsent query
        setInput(lastSubmittedInputRef.current);
      }
    } catch (err: any) {
      // Restore unsent query on failure
      setInput(lastSubmittedInputRef.current);
      if (onError && err instanceof Error) {
        onError(err);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleExecuteSubmit();
    }
  };

  return (
    <div className={`relative w-full max-w-5xl lg:max-w-6xl mx-auto isolate p-2 sm:p-4 ${className}`}>
      {/* Outer Glow Halo */}
      <div 
        className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-900/40 via-indigo-800/30 to-purple-900/40 blur-3xl pointer-events-none rounded-3xl"
        aria-hidden="true" 
      />

      <div className="relative z-10 flex flex-col p-5 sm:p-6 bg-slate-900/85 backdrop-blur-2xl border border-slate-700/60 rounded-3xl shadow-2xl transition-all duration-300 ring-1 ring-white/10 focus-within:ring-indigo-500/50">
        
        {/* Header Indicator */}
        <div className="flex items-center gap-2.5 mb-3 text-indigo-400 font-mono text-xs font-semibold tracking-wider select-none">
          <AtlasBotAvatar size="sm" isFocused={isFocused} isTyping={isTyping} isStreaming={isLoading} />
          <span>ATLAS AI ASSISTANT</span>
          {isLoading && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              PROCESSING
            </span>
          )}
        </div>

        {/* Unified Input / Thinking Animation Container (Expansive & High Clarity) */}
        <div className="relative w-full min-h-[170px] sm:min-h-[190px] rounded-2xl bg-[#0b0f19]/85 border border-slate-800/90 p-4 overflow-hidden transition-all duration-300">
          
          {/* Interactive Textarea View */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={placeholder}
            className={`w-full h-full min-h-[150px] bg-transparent text-slate-100 placeholder-slate-400 border-none outline-none resize-none text-base sm:text-lg leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 transition-opacity duration-300 ${
              isLoading ? "opacity-0 pointer-events-none select-none" : "opacity-100 pointer-events-auto"
            }`}
            aria-label="Prompt Input Area"
          />

          {/* Thinking Video Overlay with Expansive View and Ambient Cyan/Purple Glow */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-[#0b0f19]/95 backdrop-blur-md transition-opacity duration-300 z-20 p-4 ${
              isLoading ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!isLoading}
          >
            {/* Ambient Aura Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 via-indigo-500/20 to-purple-500/15 pointer-events-none animate-pulse rounded-2xl" />

            {/* High-Clarity Seamless Looping Bot Mascot Animation */}
            <div className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 flex items-center justify-center">
              <video
                ref={videoRef}
                src="/assets/bot-thinking.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(77,166,255,0.6)]"
              >
                <source src="/assets/bot-thinking.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Pulsing Status Caption */}
            <span className="relative z-10 mt-2 text-xs sm:text-sm font-medium text-cyan-300 tracking-wide animate-pulse font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              Atlas is generating solution...
            </span>
          </div>

        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 relative z-20 pointer-events-auto">
          
          {/* Bottom Left Toolbar with Animated Bot looking at textarea & Attachment Icon */}
          <div className="flex items-center gap-3">
            <AtlasBotAvatar 
              isFocused={isFocused} 
              isTyping={isTyping} 
              isStreaming={isLoading} 
              size="md" 
            />

            <button 
              type="button"
              className="p-2.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded-xl transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Attach telemetry file"
              title="Attach Document / Codebase File"
              disabled={isLoading}
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          {/* Submit Button with Loading Indicator */}
          <button
            type="button"
            onClick={handleExecuteSubmit}
            disabled={isLoading || input.trim().length === 0}
            className="flex items-center justify-center gap-2.5 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                <span className="text-cyan-200">Generating...</span>
              </>
            ) : (
              <>
                <span>Ask Atlas AI</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default WorkspaceInput;
