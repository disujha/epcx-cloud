"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Camera, Save } from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.displayName ?? "");
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your personal information.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card p-6"
      >
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-8">
          <div className="relative">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-brand-700 flex items-center justify-center text-white font-bold text-xl">
                {getInitials(user?.displayName ?? user?.email ?? "U")}
              </div>
            )}
            <button className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">
              <Camera className="w-3 h-3 text-slate-500" />
            </button>
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {user?.displayName ?? "Your Name"}
            </div>
            <div className="text-sm text-slate-400">{user?.email}</div>
            <div className="text-xs text-accent-500 font-medium mt-0.5">Starter Plan</div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {[
            { id: "displayName", label: "Full Name", value: name, onChange: setName, type: "text" },
            { id: "email", label: "Email", value: user?.email ?? "", onChange: () => {}, type: "email", disabled: true },
          ].map((f) => (
            <div key={f.id}>
              <label htmlFor={f.id} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {f.label}
              </label>
              <input
                id={f.id}
                type={f.type}
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                disabled={f.disabled}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-accent-500 transition-colors"
              />
            </div>
          ))}

          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm rounded-xl transition-all"
          >
            {saved ? "Saved!" : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
