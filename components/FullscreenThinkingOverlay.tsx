"use client";

import React, { useEffect, useState, useRef } from "react";
import { Loader2, Sparkles, Minimize2, X, Cpu, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface FullscreenThinkingOverlayProps {
  isOpen: boolean;
  promptText?: string;
  modelName?: string;
  onMinimize?: () => void;
  onCancel?: () => void;
}

const INFERENCE_STEPS = [
  "Analyzing semantic intent & architecture...",
  "Consulting Neural Specialist Pipeline...",
  "Synthesizing high-performance solution...",
  "Evaluating syntax, types & best practices...",
  "Formulating optimized response stream...",
];

export const FullscreenThinkingOverlay: React.FC<FullscreenThinkingOverlayProps> = ({
  isOpen,
  promptText = "",
  modelName = process.env.NEXT_PUBLIC_DEFAULT_MODEL || "meta/llama-3.3-70b-instruct",
  onMinimize,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Play video smoothly when open
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen]);

  // Rotate status steps every 1.8 seconds
  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setElapsedSeconds(0);
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % INFERENCE_STEPS.length);
    }, 1800);

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(timerInterval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900/90 border border-cyan-500/40 rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.3)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-6 duration-300">
        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-cyan-400/30">
          <video
            src="/assets/bot-thinking.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
            <span className="text-xs font-semibold text-cyan-300 font-mono">Atlas AI Generating</span>
            <span className="text-[10px] text-slate-400 font-mono">({elapsedSeconds}s)</span>
          </div>
          <p className="text-[11px] text-slate-300 truncate max-w-xs">{INFERENCE_STEPS[currentStepIndex]}</p>
        </div>
        <button
          onClick={() => setIsMinimized(false)}
          className="ml-2 px-3 py-1 text-xs font-medium bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg transition-colors"
        >
          Maximize
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-2xl overflow-y-auto animate-in fade-in duration-300 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Atlas AI Inference Engine"
    >
      {/* Background Ambient Glow Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-600/20 via-indigo-600/25 to-purple-600/20 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Top Floating Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
        <button
          onClick={() => {
            if (onMinimize) onMinimize();
            setIsMinimized(true);
          }}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-cyan-300 transition-colors flex items-center gap-2 text-xs font-medium shadow-lg"
          title="Minimize overlay to floating badge"
        >
          <Minimize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Minimize</span>
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2.5 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium shadow-lg"
            title="Cancel inference"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Abort</span>
          </button>
        )}
      </div>

      {/* Center Cinematic Card */}
      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-6 relative z-10 my-auto">
        
        {/* Status Header Badge */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-[0_0_20px_rgba(56,189,248,0.2)] animate-pulse">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>ATLAS NEURAL INFERENCE ENGINE · LIVE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>{elapsedSeconds}s</span>
        </div>

        {/* Large Cinematic Looping Video Showcase (High Definition & Clarity) */}
        <div className="relative group">
          {/* Pulsing Aura Halo */}
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-indigo-500/30 to-purple-500/30 rounded-[36px] blur-2xl opacity-75 animate-pulse -z-10" />

          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 rounded-3xl p-2 bg-gradient-to-b from-cyan-400/30 via-indigo-500/20 to-purple-600/30 border border-cyan-400/40 shadow-[0_0_60px_rgba(56,189,248,0.35)] backdrop-blur-2xl overflow-hidden flex items-center justify-center">
            
            <video
              ref={videoRef}
              src="/assets/bot-thinking.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-contain rounded-2xl drop-shadow-[0_0_35px_rgba(56,189,248,0.6)]"
            >
              <source src="/assets/bot-thinking.mp4" type="video/mp4" />
            </video>

            {/* Futuristic Corner Tech Accents */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 rounded-tl pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 rounded-tr pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 rounded-bl pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 rounded-br pointer-events-none" />
          </div>
        </div>

        {/* Dynamic Telemetry & Progress Stepper */}
        <div className="w-full max-w-lg space-y-4 px-4">
          
          {/* Current Step Description */}
          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              <span>Atlas AI is Generating Solution</span>
            </h3>
            <p className="text-sm font-mono text-cyan-300/90 h-6 transition-all duration-300 ease-in-out">
              {INFERENCE_STEPS[currentStepIndex]}
            </p>
          </div>

          {/* Shimmering Dynamic Progress Bar */}
          <div className="w-full h-2 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(56,189,248,0.8)]"
              style={{
                width: `${Math.min(95, 15 + currentStepIndex * 20 + (elapsedSeconds % 2) * 5)}%`,
              }}
            />
          </div>

          {/* Model & Prompt Info Pill */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-400">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-indigo-300">
              {modelName}
            </span>
            {promptText && (
              <span className="px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 truncate max-w-xs sm:max-w-sm italic">
                "{promptText}"
              </span>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default FullscreenThinkingOverlay;
