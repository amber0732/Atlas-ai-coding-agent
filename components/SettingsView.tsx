"use client";

import React from "react";
import { Settings, Cpu, ShieldCheck, Zap, Sliders, Check, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitHubConnectButton } from "@/components/GitHubConnectButton";

interface SettingsViewProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  maxOutputTokens: string;
  onMaxOutputTokensChange: (tokens: string) => void;
}

const MODEL_OPTIONS = [
  { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B (Ultra-Fast ⚡)", desc: "Lightning-fast responses (1-3s). Ideal for real-time coding chat and quick answers." },
  { id: "meta/llama-3.1-70b-instruct", name: "Llama 3.1 70B Instruct", desc: "High-capacity reasoning engine for complex architecture & multi-file refactoring." },
  { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", desc: "State-of-the-art Llama 3.3 intelligence with expanded context handling." },
  { id: "gpt-4o", name: "GPT-4o Agent Engine", desc: "Advanced multimodal reasoning kernel. Requires OpenAI API key." },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  selectedModel,
  onModelChange,
  maxOutputTokens,
  onMaxOutputTokensChange,
}) => {
  const [streamTelemetry, setStreamTelemetry] = React.useState(true);
  const [autoSave, setAutoSave] = React.useState(true);

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kernel & Platform Settings</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure real-time EEK streaming policies, model parameters, and agent execution safety bounds.
        </p>
      </div>

      <div className="rounded-2xl border border-white/40 bg-white/60 dark:border-white/10 dark:bg-slate-900/50 backdrop-blur-xl p-6 space-y-6 shadow-sm">
        
        {/* Model Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" /> Model Architecture
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MODEL_OPTIONS.map((item) => (
              <div
                key={item.id}
                onClick={() => onModelChange(item.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedModel === item.id
                    ? "border-indigo-500 bg-indigo-500/10 text-slate-900 dark:text-white shadow-md shadow-indigo-500/10"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span>{item.name}</span>
                  {selectedModel === item.id && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</p>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1.5 truncate">{item.id}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800" />

        {/* Max Output Tokens */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" /> Max Output Tokens
          </label>
          <div className="flex items-center gap-3">
            {["2048", "4096", "8192", "16384"].map((val) => (
              <button
                key={val}
                onClick={() => onMaxOutputTokensChange(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                  maxOutputTokens === val
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-500"
                    : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-600"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Active: <span className="font-mono font-semibold text-indigo-400">{maxOutputTokens}</span> tokens. Higher values allow longer, more thorough responses.
          </p>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800" />

        {/* Streaming & Telemetry */}
        <div className="space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" /> Telemetry & SSE Streaming
          </label>
          
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Live Execution Log Streaming</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Stream EEK kernel diagnosis events over SSE with AbortController protection.</p>
            </div>
            <button
              onClick={() => setStreamTelemetry(!streamTelemetry)}
              className={`w-11 h-6 rounded-full transition-colors relative ${streamTelemetry ? "bg-indigo-600" : "bg-slate-700"}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${streamTelemetry ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Automatic Diagnostic Trace Persistence</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Save detailed JSON trace files (`.eek-trace.jsonl`) after each run.</p>
            </div>
            <button
              onClick={() => setAutoSave(!autoSave)}
              className={`w-11 h-6 rounded-full transition-colors relative ${autoSave ? "bg-indigo-600" : "bg-slate-700"}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${autoSave ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800" />

        {/* GitHub Integration */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Github className="w-5 h-5 text-slate-900 dark:text-white" />
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">GitHub Workspace Integration</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Connect your GitHub account to sync repositories, create pull requests, and commit fixes.</p>
            </div>
          </div>
          <GitHubConnectButton />
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800" />

        {/* Security Policy */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Verification & Safety Policy</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Destructive actions require confirmation. Secrets automatically masked.</p>
            </div>
          </div>
          <Button className="text-xs border border-slate-300 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-300 px-3 py-1">
            Active
          </Button>
        </div>

      </div>
    </div>
  );
};

