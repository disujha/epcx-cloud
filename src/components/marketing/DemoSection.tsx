"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Send, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAIProvider } from "@/lib/ai";

interface SampleDoc {
  name: string;
  type: string;
  prompts: string[];
}

const SAMPLE_DOCS: SampleDoc[] = [
  { name: "PERMIT-TAR-2024-REF-09.pdf", type: "Try Sample Permit", prompts: ["Find missing clauses", "Highlight risks", "Summarize permit requirements"] },
  { name: "VENDOR-QUOTE-PMP-802.pdf", type: "Try Vendor Quote", prompts: ["Compare revisions", "Highlight compliance risks", "Summarize quote variances"] },
  { name: "QAQC-INSPECTION-REF-A.pdf", type: "Try Inspection Report", prompts: ["Summarize inspection", "List non-compliant items", "Find missing sign-offs"] },
  { name: "PIPING-SPEC-10A-ASME.pdf", type: "Try Specification", prompts: ["Compare revisions", "Find missing clauses", "Identify welding requirements"] },
  { name: "WELDING-PROC-SPEC-WPS-12.pdf", type: "Try WPS", prompts: ["List welding requirements", "Highlight safety risks", "Check compliance standards"] },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function DemoSection() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<SampleDoc | null>(SAMPLE_DOCS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const activeDocName = file?.name ?? selectedDoc?.name;
  const activePrompts = selectedDoc?.prompts ?? [
    "Compare revisions",
    "Find missing clauses",
    "Summarize inspection",
    "List welding requirements",
    "Highlight risks"
  ];

  function handleFile(f: File) {
    setFile(f);
    setSelectedDoc(null);
    setMessages([]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") handleFile(f);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const provider = getAIProvider("mock");
      let assistantContent = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      if (provider.stream) {
        for await (const chunk of provider.stream({
          messages: [{ role: "user", content: text }],
        })) {
          assistantContent += chunk.delta;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: assistantContent };
            return updated;
          });
          if (chatRef.current) {
            chatRef.current.scrollTop = chatRef.current.scrollHeight;
          }
        }
      } else {
        const resp = await provider.complete({
          messages: [{ role: "user", content: text }],
        });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: resp.content };
          return updated;
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section bg-white dark:bg-brand-950" id="demo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-12"
        >
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-4">
            <span className="w-6 h-px bg-slate-300 dark:bg-slate-700" />
            Interactive Demo
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            Test the review platform{" "}
            <span className="gradient-text">live</span>
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Pick a sample engineering document or upload your own PDF specification to test the technical review capability.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left panel — upload + sample docs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200",
                dragging
                  ? "border-accent-500 bg-accent-500/5"
                  : "border-slate-200 dark:border-slate-700 hover:border-accent-500/50 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" strokeWidth={1.5} />
              {file ? (
                <div>
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                    <FileText className="w-4 h-4 text-accent-500" />
                    {file.name}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Click to replace</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Drag and drop your engineering PDF here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse local files</p>
                </>
              )}
            </div>

            {/* Sample docs */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Or select a sample document below
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SAMPLE_DOCS.map((doc) => (
                  <button
                    key={doc.name}
                    onClick={() => { setSelectedDoc(doc); setFile(null); setMessages([]); }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all",
                      selectedDoc?.name === doc.name
                        ? "border-accent-500/50 bg-accent-500/5 text-accent-500"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-semibold">{doc.type}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{doc.name}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Prompts */}
            {activeDocName && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  Suggested technical queries
                </p>
                <div className="space-y-1.5">
                  {activePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      disabled={loading}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Right panel — chat */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3 flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden min-h-[500px]"
          >
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="w-7 h-7 rounded-lg bg-accent-500/15 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-accent-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Technical Review Assistant
                </div>
                {activeDocName && (
                  <div className="text-[10px] text-slate-500 truncate max-w-xs">{activeDocName}</div>
                )}
              </div>
              <div className={cn(
                "ml-auto flex items-center gap-1.5 text-[10px] font-medium",
                activeDocName ? "text-accent-500" : "text-slate-400"
              )}>
                <div className={cn("w-1.5 h-1.5 rounded-full", activeDocName ? "bg-accent-500 animate-pulse" : "bg-slate-400")} />
                {activeDocName ? "Document loaded" : "No document selected"}
              </div>
            </div>

            {/* Messages */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    {activeDocName
                      ? "Select one of the suggested technical queries or type your own question below."
                      : "Select or upload a document to get started."}
                  </p>
                </div>
              )}
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                        msg.role === "user"
                          ? "bg-accent-500 text-white rounded-br-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm"
                      )}
                    >
                      {msg.content}
                      {msg.role === "assistant" && loading && i === messages.length - 1 && msg.content === "" && (
                        <span className="inline-flex gap-1 mt-1">
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
            <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                  placeholder={activeDocName ? "Ask about this document..." : "Select a document first"}
                  disabled={!activeDocName || loading}
                  className="flex-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-accent-500 disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!activeDocName || !input.trim() || loading}
                  className="p-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

