"use client";
import React, { useEffect, useState } from "react";

export interface GitHubProfile {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
  profileUrl?: string;
}

export default function GitHubAccountButton() {
  const [ghState, setGhState] = useState<GitHubProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = () => {
    fetch("/api/auth/github/status")
      .then((res) => res.json())
      .then((data) => setGhState(data))
      .catch(() => setGhState({ connected: false }));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/github/disconnect", { method: "POST" });
      if (res.ok) {
        setGhState({ connected: false });
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!ghState) return null;

  if (ghState.connected) {
    return (
      <div className="flex items-center gap-2 bg-[#0d1117] border border-emerald-500/30 rounded-xl px-3 py-1.5 shadow-sm">
        <img
          src={ghState.avatarUrl}
          alt={ghState.username}
          className="w-5 h-5 rounded-full ring-1 ring-emerald-400"
        />
        <a
          href={ghState.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-emerald-300 hover:underline"
        >
          @{ghState.username}
        </a>
        <button
          onClick={handleDisconnect}
          disabled={loading}
          className="ml-2 text-[11px] text-slate-400 hover:text-red-400 font-medium transition disabled:opacity-50"
          title="Unlink GitHub Account"
        >
          {loading ? "..." : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/github"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#161b22] hover:bg-[#21262d] border border-slate-700 text-white text-xs font-medium transition shadow-sm hover:border-slate-500"
    >
      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
      Connect GitHub
    </a>
  );
}

export { GitHubAccountButton };
