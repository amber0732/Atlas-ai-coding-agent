"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AtlasBotAvatarProps {
  isFocused?: boolean;
  isTyping?: boolean;
  isStreaming?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const AtlasBotAvatar: React.FC<AtlasBotAvatarProps> = ({
  isFocused = false,
  isTyping = false,
  isStreaming = false,
  size = "md",
  className,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [typingTick, setTypingTick] = useState(0);

  // Natural periodic blinking effect (every ~4-5 seconds)
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 4200 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Micro-motion jitter when user is actively typing
  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => {
        setTypingTick((prev) => (prev + 1) % 4);
      }, 120);
      return () => clearInterval(interval);
    }
  }, [isTyping]);

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-20 h-20",
  };

  // Eye movement calculation:
  // When looking straight: (0, 0)
  // When focused on textarea (which is above-right): shift up and slightly right (-5px up, +4px right on md size)
  const eyeOffset = isFocused
    ? {
        x: isTyping ? 3 + (typingTick % 2) * 1.5 : 4,
        y: isTyping ? -6 + ((typingTick + 1) % 2) * 1.2 : -5,
      }
    : isStreaming
    ? { x: 0, y: -2 }
    : { x: 0, y: 0 };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none transition-all duration-300 ease-out cursor-pointer group",
        sizeClasses[size],
        isFocused ? "-translate-y-0.5 rotate-[4deg] scale-105" : "translate-y-0 rotate-0",
        className
      )}
      title="Atlas AI Bot - Watching your code"
    >
      {/* Outer Glow Halo */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-md transition-all duration-500 -z-10",
          isFocused
            ? "bg-cyan-500/40 scale-110"
            : isStreaming
            ? "bg-indigo-500/50 scale-125 animate-pulse"
            : "bg-blue-500/20 group-hover:bg-blue-500/30 scale-95"
        )}
      />

      {/* SVG Robot Avatar with Real Moveable Glowing Blue Eyes */}
      <svg
        viewBox="0 0 100 85"
        className="w-full h-full drop-shadow-md overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Helmet Gradient */}
          <linearGradient id="helmetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="35%" stopColor="#c7d2fe" />
            <stop offset="70%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>

          {/* Side Ears Gradient */}
          <linearGradient id="earGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Eye Glow Filter */}
          <filter id="neonBlueGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Visor Specular Highlight */}
          <linearGradient id="visorGlass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Left Ear */}
        <rect
          x="3"
          y="32"
          width="9"
          height="24"
          rx="4.5"
          fill="url(#earGrad)"
          className="transition-all duration-300"
          style={{
            transform: isFocused ? "translateY(-1px) scale(0.98)" : "none",
          }}
        />

        {/* Right Ear */}
        <rect
          x="88"
          y="32"
          width="9"
          height="24"
          rx="4.5"
          fill="url(#earGrad)"
          className="transition-all duration-300"
          style={{
            transform: isFocused ? "translateY(-1px) scale(0.98)" : "none",
          }}
        />

        {/* Outer Helmet / Head */}
        <rect
          x="8"
          y="5"
          width="84"
          height="75"
          rx="37.5"
          fill="url(#helmetGrad)"
          className="transition-all duration-300"
        />

        {/* Dark Visor Screen */}
        <rect
          x="15"
          y="15"
          width="70"
          height="55"
          rx="25"
          fill="#060913"
          stroke="#1e293b"
          strokeWidth="1.5"
        />

        {/* Visor Glass Reflection */}
        <path
          d="M 22 20 Q 50 15 78 20 C 72 32 28 32 22 20 Z"
          fill="url(#visorGlass)"
        />

        {/* Interactive Glowing Blue Eyes Group */}
        <g
          className="transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
          }}
        >
          {/* Left Eye */}
          <ellipse
            cx="37"
            cy="44"
            rx={isBlinking ? 6.5 : 6.5}
            ry={isBlinking ? 0.8 : 7}
            fill="#38bdf8"
            filter="url(#neonBlueGlow)"
            className={cn(
              "transition-all duration-150",
              isFocused && "fill-[#00f0ff]",
              isStreaming && "animate-pulse"
            )}
          />
          {/* Left Eye Pupil Center Spark */}
          {!isBlinking && (
            <circle
              cx="38.5"
              cy="42.5"
              r="2"
              fill="#ffffff"
              opacity="0.9"
            />
          )}

          {/* Right Eye */}
          <ellipse
            cx="63"
            cy="44"
            rx={isBlinking ? 6.5 : 6.5}
            ry={isBlinking ? 0.8 : 7}
            fill="#38bdf8"
            filter="url(#neonBlueGlow)"
            className={cn(
              "transition-all duration-150",
              isFocused && "fill-[#00f0ff]",
              isStreaming && "animate-pulse"
            )}
          />
          {/* Right Eye Pupil Center Spark */}
          {!isBlinking && (
            <circle
              cx="64.5"
              cy="42.5"
              r="2"
              fill="#ffffff"
              opacity="0.9"
            />
          )}
        </g>
      </svg>
    </div>
  );
};
