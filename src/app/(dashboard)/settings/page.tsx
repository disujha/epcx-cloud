"use client";

import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Bell, Shield, Palette, Globe } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  const sections = [
    {
      icon: Palette,
      title: "Appearance",
      desc: "Control how EPCX.cloud looks for you.",
      children: (
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">Theme</div>
            <div className="text-xs text-slate-400">Light, dark, or system preference</div>
          </div>
          <select className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-accent-500">
            <option>System</option>
            <option>Light</option>
            <option>Dark</option>
          </select>
        </div>
      ),
    },
    {
      icon: Bell,
      title: "Notifications",
      desc: "Manage how you receive updates.",
      children: (
        <div className="space-y-3 py-2">
          {[
            { label: "Review complete", desc: "When AI finishes reviewing a document" },
            { label: "Document processed", desc: "When a document is ready for review" },
            { label: "Weekly summary", desc: "Weekly activity report via email" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
              </div>
              <div className="w-10 h-6 bg-accent-500 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: Shield,
      title: "Security",
      desc: "Manage your account security settings.",
      children: (
        <div className="py-3 space-y-3">
          <button className="text-sm text-accent-500 hover:text-accent-600 font-medium transition-colors">
            Change password
          </button>
          <div className="text-xs text-slate-400">
            Last sign-in: {user?.metadata?.lastSignInTime ?? "Unknown"}
          </div>
        </div>
      ),
    },
    {
      icon: Globe,
      title: "AI Provider",
      desc: "Configure which AI model powers your reviews.",
      children: (
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">Active Provider</div>
              <div className="text-xs text-slate-400">Currently using demo mode</div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-500/10 text-accent-500">
              Demo
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Connect OpenAI, Claude, Gemini, or a private model under Enterprise plan.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your workspace preferences.</p>
      </motion.div>

      {sections.map((section, i) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card"
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <section.icon className="w-4 h-4 text-slate-500" strokeWidth={1.75} />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">{section.title}</div>
              <div className="text-xs text-slate-400">{section.desc}</div>
            </div>
          </div>
          <div className="px-6 divide-y divide-slate-100 dark:divide-slate-800">
            {section.children}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
