// Provider-agnostic AI adapter types.
// Swap implementations in index.ts without touching UI code.

export type AIProviderName = "openai" | "claude" | "gemini" | "local" | "mock";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  documentContext?: string; // extracted document text
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  provider: AIProviderName;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: "stop" | "length" | "error";
}

export interface AIStreamChunk {
  delta: string;
  done: boolean;
}

export interface AIProvider {
  name: AIProviderName;
  model: string;
  complete(request: AIRequest): Promise<AIResponse>;
  stream?(request: AIRequest): AsyncIterable<AIStreamChunk>;
}
