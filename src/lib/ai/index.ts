import type { AIProvider, AIProviderName } from "./types";
import { mockProvider } from "./mock-provider";
import { geminiProvider } from "./firebase-provider";

/**
 * Factory function that returns the appropriate AI provider.
 * Add new providers here without touching UI code.
 *
 * Future integrations:
 *   - openai: Use openai npm package with OPENAI_API_KEY
 *   - claude: Use @anthropic-ai/sdk with ANTHROPIC_API_KEY
 *   - gemini: Firebase callable backed by the server-side budgeted trial function
 *   - local: Point to a local Ollama/LM Studio endpoint
 */
export function getAIProvider(provider: AIProviderName): AIProvider {
  switch (provider) {
    case "mock":
      return mockProvider;

    // Placeholder cases — implement when ready
    case "openai":
      throw new Error("OpenAI provider not yet configured. Set OPENAI_API_KEY.");
    case "claude":
      throw new Error("Claude provider not yet configured. Set ANTHROPIC_API_KEY.");
    case "gemini":
      return geminiProvider;
    case "local":
      throw new Error("Local provider not yet configured. Set LOCAL_AI_ENDPOINT.");

    default:
      throw new Error("No supported AI provider was selected.");
  }
}

export { mockProvider };
export type { AIProvider, AIProviderName };
