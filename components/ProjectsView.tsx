"use client";

import React from "react";
import { Folder, Play, CheckCircle2, AlertCircle, Clock, ExternalLink, Code2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProjectItem {
  id: string;
  name: string;
  stack: string;
  status: "Active" | "Saved" | "Running";
  lastRun: string;
  description: string;
}

const projects: ProjectItem[] = [
  {
    id: "add-bug",
    name: "add-bug Demo Project",
    stack: "Node.js · Express · Jest",
    status: "Active",
    lastRun: "2 min ago",
    description: "Sample test suite with reproducible async state bug for EEK kernel diagnostics.",
  },
  {
    id: "atlas-dashboard",
    name: "Atlas AI Dashboard",
    stack: "Next.js 14 · TypeScript · Tailwind",
    status: "Saved",
    lastRun: "1 hour ago",
    description: "Real-time AI telemetry command center with decoupled glassmorphism UI.",
  },
  {
    id: "payments-service",
    name: "Payments & Invoicing Service",
    stack: "Node.js · TypeScript · Stripe API",
    status: "Saved",
    lastRun: "Yesterday",
    description: "Microservice handling webhook event verification and tokenized checkouts.",
  },
  {
    id: "cli-utilities",
    name: "FastAPI Engine Utilities",
    stack: "Python 3.11 · FastAPI · Pydantic",
    status: "Saved",
    lastRun: "3 days ago",
    description: "Backend telemetry processing scripts and model benchmark runner.",
  },
];

interface ProjectsViewProps {
  onRunDiagnosis: (projectId: string, bugReport: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onRunDiagnosis }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Workspace Projects</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage projects configured for automatic EEK kernel error diagnosis and repair.
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-xs rounded-xl shadow-md shadow-indigo-500/20">
          <Plus className="w-4 h-4" /> Add Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group relative rounded-2xl border border-white/40 bg-white/60 dark:border-white/10 dark:bg-slate-900/50 backdrop-blur-xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">
                      {project.name}
                    </h3>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{project.stack}</span>
                  </div>
                </div>
                <Badge
                  className={
                    project.status === "Active"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                      : "bg-slate-500/10 text-slate-400 border-slate-500/30 text-[10px]"
                  }
                >
                  {project.status}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{project.description}</p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5" /> Last run: {project.lastRun}
              </span>
              <Button
                onClick={() => onRunDiagnosis(project.id, `Diagnose test failure in ${project.name}`)}
                className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-xs rounded-lg transition-all gap-1.5 px-3 py-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Run Diagnosis
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
