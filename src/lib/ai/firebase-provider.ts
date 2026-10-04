import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase/config";
import type { AIProvider, AIRequest, AIResponse } from "./types";

interface GeminiTrialRequest {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  documentContext?: string;
  systemPrompt?: string;
}

interface GeminiTrialResponse extends Omit<AIResponse, "finishReason"> {
  finishReason: string;
  trialUsesRemaining: number;
}

export interface GeminiTrialStatus {
  trialUsesRemaining: number;
  monthlyBudgetAvailable: boolean;
  model: string;
}

export async function fetchGeminiTrialStatus(): Promise<GeminiTrialStatus> {
  const call = httpsCallable<void, GeminiTrialStatus>(
    getFunctions(app, "us-central1"),
    "geminiTrialStatus"
  );
  return (await call()).data;
}

export const geminiProvider: AIProvider = {
  name: "gemini",
  model: "gemini-3.1-flash-lite",

  async complete(request: AIRequest): Promise<AIResponse> {
    const systemMessages = request.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content);
    const input: GeminiTrialRequest = {
      messages: request.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" as const : "user" as const,
          content: message.content,
        })),
      documentContext: request.documentContext,
      systemPrompt: [request.systemPrompt, ...systemMessages].filter(Boolean).join("\n\n") || undefined,
    };

    const call = httpsCallable<GeminiTrialRequest, GeminiTrialResponse>(
      getFunctions(app, "us-central1"),
      "geminiTrial"
    );
    const result = await call(input);
    const data = result.data;
    return {
      content: data.content,
      provider: "gemini",
      model: data.model,
      usage: data.usage,
      finishReason: data.finishReason === "MAX_TOKENS" ? "length" : "stop",
      trialUsesRemaining: data.trialUsesRemaining,
    };
  },
};
