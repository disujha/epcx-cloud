"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, Send, ChevronRight, RotateCcw, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAIProvider } from "@/lib/ai";

const SUGGESTED_PROMPTS = [
  "Summarize this specification.",
  "Compare Revision B with Revision C.",
  "Find welding requirements.",
  "List all inspection checkpoints.",
  "Identify missing compliance items.",
];

const SAMPLE_DOCS = [
  { name: "PIPING-SPEC-10A-REV-C.pdf", project: "Refinery TAR 2024" },
  { name: "PRESSURE-VESSEL-SPEC-REV-B.pdf", project: "Pump Skid Package" },
  { name: "ELECTRICAL-SPEC-IS-400.pdf", project: "—" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIReviewPage() {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    if (!text.trim() || loading || !selectedDoc) return;
    const userMsg: Message = { role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

    const provider = getAIProvider("mock");
    let assistantContent = "";

    if (provider.stream) {
      for await (const chunk of provider.stream({ messages: [{ role: "user", content: text }] })) {
        assistantContent += chunk.delta;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantContent, timestamp: new Date() };
          return updated;
        });
      }
    } else {
      const resp = await provider.complete({ messages: [{ role: "user", content: text }] });
      assistantContent = resp.content;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: assistantContent, timestamp: new Date() };
        return updated;
      });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">AI Review</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select a document and ask any engineering question.</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
            New Review
          </button>
        )}
      </motion.div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Document selector */}
          <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Select Document</h3>
            </div>
            <div className="space-y-2">
              {SAMPLE_DOCS.map((doc) => (
                <button
                  key={doc.name}
                  onClick={() => { setSelectedDoc(doc.name); setMessages([]); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-xs",
                    selectedDoc === doc.name
                      ? "bg-accent-500/10 border border-accent-500/30 text-accent-600 dark:text-accent-400"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent"
                  )}
                >
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{doc.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{doc.project}</div>
                  </div>
                  {selectedDoc === doc.name && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested prompts */}
          {selectedDoc && (
            <div className="bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Suggested Prompts</h3>
              <div className="space-y-1.5">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    disabled={loading}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-brand-900 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-accent-500/15 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-accent-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">EPCX AI Review</div>
              {selectedDoc && <div className="text-[10px] text-slate-400 truncate">{selectedDoc}</div>}
            </div>
            <div className={cn("ml-auto flex items-center gap-1.5 text-[10px] font-medium", selectedDoc ? "text-accent-500" : "text-slate-400")}>
              <div className={cn("w-1.5 h-1.5 rounded-full", selectedDoc ? "bg-accent-500 animate-pulse" : "bg-slate-400")} />
              {selectedDoc ? "Ready" : "No document"}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent-500/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-accent-500" />
                </div>
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">AI Review Ready</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  {selectedDoc
                    ? "Ask any question about this document — specifications, compliance, welding requirements, and more."
                    : "Select a document from the left panel to begin your AI review."}
                </p>
              </div>
            )}
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-lg bg-accent-500/15 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-accent-500" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-accent-500 text-white rounded-br-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-sm"
                    )}
                  >
                    {msg.content || (
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Input */}
          <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                placeholder={selectedDoc ? "Ask about this document..." : "Select a document first"}
                disabled={!selectedDoc || loading}
                className="flex-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent-500 disabled:opacity-50 transition-colors"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!selectedDoc || !input.trim() || loading}
                className="p-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Demo mode — responses are illustrative examples for EPC engineering contexts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
