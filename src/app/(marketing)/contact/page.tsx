"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import type { Metadata } from "next";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="pt-24 pb-20 px-4 bg-white dark:bg-brand-950 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">
            <span className="w-6 h-px bg-slate-300 dark:bg-slate-700" />
            Contact
          </div>
          <h1 className="font-display text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
            Get in touch
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl">
            Interested in EPCX.cloud for your team? Book a demo or send us a
            message — we typically respond within one business day.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-10">
          {/* Contact info */}
          <div className="md:col-span-2 space-y-6">
            {[
              { icon: Mail, label: "Email", value: "hello@epcx.cloud", href: "mailto:hello@epcx.cloud" },
              { icon: Phone, label: "Phone", value: "Available upon request", href: "#" },
              { icon: MapPin, label: "Headquarters", value: "Engineering teams worldwide", href: "#" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4.5 h-4.5 text-accent-500" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                    {item.label}
                  </div>
                  <a href={item.href} className="text-sm text-slate-700 dark:text-slate-300 hover:text-accent-500 transition-colors">
                    {item.value}
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-3"
          >
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center rounded-2xl border border-accent-500/30 bg-accent-500/5">
                <div className="w-12 h-12 rounded-full bg-accent-500/20 flex items-center justify-center mb-4">
                  <Send className="w-5 h-5 text-accent-500" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Message sent!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  We'll get back to you within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  {[
                    { id: "firstName", label: "First Name", type: "text", placeholder: "John" },
                    { id: "lastName", label: "Last Name", type: "text", placeholder: "Smith" },
                  ].map((f) => (
                    <div key={f.id}>
                      <label htmlFor={f.id} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        {f.label}
                      </label>
                      <input
                        id={f.id}
                        type={f.type}
                        required
                        placeholder={f.placeholder}
                        className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                {[
                  { id: "email", label: "Work Email", type: "email", placeholder: "john@company.com" },
                  { id: "company", label: "Company", type: "text", placeholder: "Engineering firm name" },
                ].map((f) => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      {f.label}
                    </label>
                    <input
                      id={f.id}
                      type={f.type}
                      required
                      placeholder={f.placeholder}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent-500 transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="message" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    placeholder="Tell us about your engineering team and what you're looking to solve..."
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent-500 transition-colors resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send Message"}
                  {!loading && <Send className="w-4 h-4" />}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
