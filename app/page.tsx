"use client";

import { useEffect, useState, useRef } from "react";
import {
  Bell,
  BookOpen,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode2,
  Folder,
  Github,
  Home,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Moon,
  AlertTriangle,
  Play,
  StopCircle,
  Cpu,
  Send,
  Settings,
  Sparkles,
  Sun,
  Terminal,
  Upload,
  XCircle,
  LogIn,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceInput } from "@/components/WorkspaceInput";
import { ProjectsView } from "@/components/ProjectsView";
import { SettingsView } from "@/components/SettingsView";
import { FullscreenThinkingOverlay } from "@/components/FullscreenThinkingOverlay";
import { GitHubConnectButton } from "@/components/GitHubConnectButton";
import AuthModal, { UserProfile } from "@/components/AuthModal";
import { cn } from "@/lib/utils";

const navItems = [
  [Home, "Home"],
  [MessageCircle, "Chat"],
  [Folder, "Projects"],
  [Github, "GitHub"],
  [Settings, "Settings"],
] as const;

const quickActions = [
  [Bug, "Debug", "Find and fix issues", "text-blue-600 dark:text-blue-400", "bg-blue-100 dark:bg-blue-400/15"],
  [BookOpen, "Explain", "Understand how your code works", "text-violet-600 dark:text-violet-400", "bg-violet-100 dark:bg-violet-400/15"],
  [Code2, "Refactor", "Improve code quality and structure", "text-emerald-600 dark:text-emerald-400", "bg-emerald-100 dark:bg-emerald-400/15"],
] as const;

const projectItems = [
  ["add-bug", "Node.js · EEK Demo", "Open"],
  ["Atlas AI dashboard", "Next.js · TypeScript", "Saved"],
  ["Payments service", "Node.js · Express", "Saved"],
  ["CLI utilities", "Python · FastAPI", "Saved"],
] as const;

const chatItems = [
  ["Fix auth redirect bug", "Now"],
  ["Explain query optimizer", "1d"],
  ["Write unit tests", "1d"],
  ["Optimize API response", "2d"],
  ["Refactor user service", "2d"],
] as const;

const activityItems = [
  ["API client refactor", "2 min ago", "bg-emerald-400"],
  ["Auth middleware review", "1h ago", "bg-blue-500"],
  ["Dashboard tests", "Mon, 10:24 AM", "bg-violet-500"],
  ["Database optimization", "Mon, 9:15 AM", "bg-orange-400"],
  ["UI bug fix", "Sun, 11:30 AM", "bg-cyan-400"],
] as const;

const TICKER_MESSAGES = [
  "Reproducing bug...",
  "Collecting evidence...",
  "Consulting specialists...",
  "Evaluating candidates...",
  "Validating fix...",
];

const glassCard = "rounded-[24px] border border-white/40 bg-white/60 shadow-sm backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-slate-900/40";
const primaryText = "text-slate-900 dark:text-white";
const bodyText = "text-slate-700 dark:text-white/80";
const mutedText = "text-slate-500 dark:text-slate-400";

type LogEntry = {
  type: string;
  message?: string;
  phase?: string;
  timestamp?: string;
  [key: string]: any;
};

function CinematicCanvas({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-500 opacity-40 dark:opacity-60"
        style={{ backgroundImage: `url(${isDarkMode ? "/atlas-ai-dark-bg.png" : "/atlas-ai-light-bg.png"})` }}
        aria-hidden="true"
      />
    </>
  );
}

export default function CombinedDashboard() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<"Home" | "Chat" | "Projects" | "GitHub" | "Settings">("Home");
  const [promptInput, setPromptInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [currentPromptQuery, setCurrentPromptQuery] = useState("");

  // Model settings - wired to SettingsView and /api/chat
  const [selectedModel, setSelectedModel] = useState(process.env.NEXT_PUBLIC_DEFAULT_MODEL || "meta/llama-3.3-70b-instruct");
  const [maxOutputTokens, setMaxOutputTokens] = useState("2048");

  // Diagnosis Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentPhase, setCurrentPhase] = useState("Idle");
  const [progress, setProgress] = useState(0);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Sanitize any legacy 8b model selection from stale client states
  useEffect(() => {
    if (selectedModel && selectedModel.includes("8b-instruct")) {
      setSelectedModel(process.env.NEXT_PUBLIC_DEFAULT_MODEL || "meta/llama-3.3-70b-instruct");
    }
  }, [selectedModel]);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Restore active user session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setIsAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
    document.documentElement.classList.toggle("dark");
  };

  const [errorToast, setErrorToast] = useState<string | null>(null);

  const showErrorToast = (msg: string) => {
    setErrorToast(msg);
    setTimeout(() => {
      setErrorToast((curr) => (curr === msg ? null : curr));
    }, 6000);
  };

  const startDiagnosis = async (customPrompt?: string): Promise<boolean> => {
    if (isRunning) return false;

    const bugReportText = typeof customPrompt === "string" && customPrompt.trim() ? customPrompt : (promptInput || "The test is failing in add-bug demo project");
    setCurrentPromptQuery(bugReportText);

    setIsRunning(true);
    setLogs([]);
    setProgress(0);
    setCurrentPhase("Initializing EEK Kernel...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bugReport: bugReportText,
          reproCommand: "npm test",
          targetDir: undefined,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }
      if (!response.body) throw new Error("ReadableStream not supported");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const readStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              const parts = line.split("\ndata:");
              const eventName = parts[0].replace("event:", "").trim();
              const dataLine = parts[1];
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.trim());
                  handleEvent(eventName, data);
                } catch {
                  handleEvent("raw_log", { message: line });
                }
              }
            } else if (line.includes("data:")) {
              const dataLine = line.slice(line.indexOf("data:") + 5);
              try {
                const data = JSON.parse(dataLine.trim());
                handleEvent(data.type || "raw_log", data);
              } catch {
                handleEvent("raw_log", { message: line });
              }
            }
          }
        }
        setIsRunning(false);
        setCurrentPhase("Diagnosis Complete");
      };

      readStream();
      return true;
    } catch (err: any) {
      if (err.name === "AbortError") return false;
      console.error(err);
      setLogs((prev) => [...prev, { type: "error", message: err.message, timestamp: new Date().toISOString() }]);
      setIsRunning(false);
      showErrorToast(err.message || "Failed to start diagnosis");
      return false;
    }
  };

  const handleEvent = (event: string, data: any) => {
    setLogs((prev) => [...prev, { type: event, ...data, timestamp: new Date().toISOString() }]);
    if (data.phase) setCurrentPhase(data.phase);
    if (event === "phase_start") setProgress((p) => Math.min(p + 20, 90));
    if (event === "complete" || event === "success") setProgress(100);
  };

  const stopDiagnosis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRunning(false);
      setCurrentPhase("Aborted by User");
    }
  };

  const sendChatPrompt = async (userMsg: string): Promise<boolean> => {
    if (!userMsg.trim()) return false;
    setCurrentPromptQuery(userMsg);
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsSendingChat(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMsg,
          messages: [
            ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg }
          ],
          model: selectedModel
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }
      const answer = data.answer || data.content || data.reply || "No response generated.";
      setChatHistory((prev) => [...prev, { role: "assistant", content: answer }]);
      return true;
    } catch (err: any) {
      const errorMsg = err.message || "Network request failed";
      setChatHistory((prev) => [...prev, { role: "assistant", content: `⚠️ Error: ${errorMsg}` }]);
      showErrorToast(errorMsg);
      return false;
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleWorkspaceSubmit = async (prompt: string): Promise<boolean> => {
    const trimmed = prompt.trim();
    if (!trimmed) return false;

    // Check if user explicitly asked for project test diagnosis
    const isDeepDiagnosis = trimmed.startsWith("/diagnose") ||
      trimmed.startsWith("/fix") ||
      trimmed.toLowerCase().includes("run test") ||
      trimmed.toLowerCase().includes("reproduce bug");

    if (isDeepDiagnosis) {
      return await startDiagnosis(trimmed.replace(/^\/(diagnose|fix)\s*/i, ""));
    } else {
      return await sendChatPrompt(trimmed);
    }
  };

  const handleSendChat = async () => {
    if (!promptInput.trim()) return;
    const msg = promptInput;
    setPromptInput("");
    await sendChatPrompt(msg);
  };

  return (
    <div className={cn("min-h-screen relative font-sans transition-colors duration-300", isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>
      <CinematicCanvas isDarkMode={isDarkMode} />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Horizontal Top Enterprise Navbar */}
        <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl px-4 sm:px-6 lg:px-8 py-3 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* 1. Left Brand & Mascot Logo */}
            <div
              className="flex items-center gap-3 shrink-0 cursor-pointer group"
              onClick={() => setActiveTab("Home")}
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center p-1.5 border border-indigo-500/25 shadow-lg shadow-indigo-500/15 group-hover:border-indigo-500/50 transition-colors">
                <img
                  src="/assets/bot-logo.png"
                  alt="Atlas AI Logo"
                  className="w-full h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h1 className={cn("font-bold text-base tracking-tight leading-tight", primaryText)}>Atlas AI</h1>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md font-semibold">
                    EOS v1.0 · EEK v1.0
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Autonomous Coding Agent</p>
              </div>
            </div>

            {/* 2. Center Horizontal Navigation Bar (Top Pill Menu) */}
            <nav className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-inner">
              {navItems.map(([Icon, label]) => {
                const isActive = activeTab === label;
                return (
                  <button
                    key={label}
                    onClick={() => setActiveTab(label as any)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-[1.02]"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* 3. Right Action Controls */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* GitHub OAuth Connection Button */}
              <GitHubConnectButton />

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </button>

              {/* Kernel Status Badge */}
              <div
                className={cn(
                  "hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border",
                  isRunning
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 animate-pulse"
                    : "bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full", isRunning ? "bg-emerald-400" : "bg-slate-400")} />
                <span>{isRunning ? "Kernel Active" : "System Ready"}</span>
              </div>

              {/* User Session Chip / Sign In Button */}
              {currentUser ? (
                <div className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md text-xs shadow-sm">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : "U"}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline max-w-[100px] truncate">
                    {currentUser.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-500/25 transition-all hover:scale-[1.02]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content View with Unobstructed Full-Width Background */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === "Projects" ? (
              <ProjectsView
                onRunDiagnosis={(projectId, bugReport) => {
                  setActiveTab("Home");
                  setPromptInput(bugReport);
                  startDiagnosis(bugReport);
                }}
              />
            ) : activeTab === "Settings" ? (
              <SettingsView
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                maxOutputTokens={maxOutputTokens}
                onMaxOutputTokensChange={setMaxOutputTokens}
              />
            ) : activeTab === "GitHub" ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* GitHub Hub Header */}
                <div className={cn(glassCard, "p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80")}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center border border-slate-700 shadow-xl">
                        <Github className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className={cn("text-lg font-bold", primaryText)}>GitHub Tool Integration</h2>
                        <p className={cn("text-xs mt-0.5", mutedText)}>
                          Autonomous repository creation, branch commits, and pull request workflows.
                        </p>
                      </div>
                    </div>
                    <div>
                      <GitHubConnectButton />
                    </div>
                  </div>
                </div>

                {/* Quick GitHub Action Workflows */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => {
                      const prompt = "Create a new public GitHub repository called atlas-agent-demo with an initial README.md";
                      setActiveTab("Home");
                      setPromptInput(prompt);
                      sendChatPrompt(prompt);
                    }}
                    className={cn(glassCard, "p-5 rounded-2xl cursor-pointer hover:scale-[1.02] transition-all group")}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition-colors">
                      <Folder className="w-5 h-5" />
                    </div>
                    <h3 className={cn("font-bold text-sm", primaryText)}>Create Repository</h3>
                    <p className={cn("text-xs mt-1 leading-relaxed", mutedText)}>
                      Prompt the agent to autonomously spin up a new repository with full scaffolding.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      const prompt = "Inspect repository amber0732/atlas-ai-coding-agent and summarize the recent branches and commits";
                      setActiveTab("Home");
                      setPromptInput(prompt);
                      sendChatPrompt(prompt);
                    }}
                    className={cn(glassCard, "p-5 rounded-2xl cursor-pointer hover:scale-[1.02] transition-all group")}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 transition-colors">
                      <Code2 className="w-5 h-5" />
                    </div>
                    <h3 className={cn("font-bold text-sm", primaryText)}>Inspect Branches & Commits</h3>
                    <p className={cn("text-xs mt-1 leading-relaxed", mutedText)}>
                      Examine branch trees, check commit history, and verify project activity.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      const prompt = "Create a pull request on the repository to fix typescript typing warnings and add unit tests";
                      setActiveTab("Home");
                      setPromptInput(prompt);
                      sendChatPrompt(prompt);
                    }}
                    className={cn(glassCard, "p-5 rounded-2xl cursor-pointer hover:scale-[1.02] transition-all group")}
                  >
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <h3 className={cn("font-bold text-sm", primaryText)}>Generate Pull Request</h3>
                    <p className={cn("text-xs mt-1 leading-relaxed", mutedText)}>
                      Autonomously generate feature branches, commit code diffs, and create PRs.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Quick Action Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickActions.map(([Icon, title, desc, textColor, bgColor]) => (
                    <div
                      key={title}
                      onClick={() => {
                        const prompt = `${title}: analyze codebase and ${desc.toLowerCase()}`;
                        setPromptInput(prompt);
                        sendChatPrompt(prompt);
                      }}
                      className={cn(glassCard, "p-4 flex items-center gap-4 hover:scale-[1.01] cursor-pointer")}
                    >
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", bgColor)}>
                        <Icon className={cn("w-6 h-6", textColor)} />
                      </div>
                      <div>
                        <h3 className={cn("font-semibold text-sm", primaryText)}>{title}</h3>
                        <p className={cn("text-xs mt-0.5", mutedText)}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expansive Glassmorphism Interactive Command Workspace Input */}
                <WorkspaceInput
                  isStreaming={isRunning || isSendingChat}
                  onSubmit={handleWorkspaceSubmit}
                />

                {/* Single Unified Conversation Stream */}
                {(chatHistory.length > 0 || isSendingChat) && (
                  <div className="max-w-5xl mx-auto space-y-4 pt-2 animate-in fade-in duration-300">
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-4 rounded-2xl max-w-[85%] whitespace-pre-wrap leading-relaxed shadow-lg text-sm backdrop-blur-xl transition-all border",
                          msg.role === "user"
                            ? "bg-indigo-600/90 text-white ml-auto border-indigo-500/50"
                            : "bg-slate-900/85 border-slate-700/60 text-slate-100 mr-auto"
                        )}
                      >
                        <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-semibold mb-1.5 flex items-center gap-1.5">
                          {msg.role === "user" ? (
                            <span>You</span>
                          ) : (
                            <>
                              <img src="/assets/bot-logo.png" alt="Atlas AI" className="w-3.5 h-3.5 object-contain inline-block" />
                              <span>Atlas AI Assistant</span>
                            </>
                          )}
                        </div>
                        <div className="text-slate-100">{msg.content}</div>
                      </div>
                    ))}
                    {isSendingChat && (
                      <div className="p-4 rounded-2xl max-w-[85%] bg-slate-900/85 border border-slate-700/60 text-indigo-300 mr-auto flex items-center gap-3 text-sm backdrop-blur-xl shadow-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Atlas AI is generating response...</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Fullscreen HD Mascot AI Thinking Experience */}
      <FullscreenThinkingOverlay
        isOpen={isSendingChat || isRunning}
        promptText={currentPromptQuery}
        modelName={selectedModel}
        onCancel={() => {
          if (isRunning) stopDiagnosis();
          setIsSendingChat(false);
        }}
      />

      {/* Floating Error Toast Notification */}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-red-950/90 border border-red-500/50 text-red-200 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-md">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
          <div className="flex-1 text-xs leading-relaxed font-medium">{errorToast}</div>
          <button
            onClick={() => setErrorToast(null)}
            className="p-1 text-red-400 hover:text-red-200 hover:bg-red-900/50 rounded-lg transition-colors"
            aria-label="Dismiss error"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Force Auth Wall for unauthenticated visitors */}
      {!isAuthChecking && !currentUser && (
        <AuthModal
          isOpen={true}
          canClose={false}
          onClose={() => { }} // No-op: Cannot close without logging in
          onAuthSuccess={(userData) => setCurrentUser(userData)}
        />
      )}

      {/* Manual Auth Modal for signed-in users (e.g. switch account) */}
      {currentUser && isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          canClose={true}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(userData) => setCurrentUser(userData)}
        />
      )}
    </div>
  );
}
