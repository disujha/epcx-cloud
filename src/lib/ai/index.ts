import type { AIProvider, AIProviderName } from "./types";
import { mockProvider } from "./mock-provider";

/**
 * Factory function that returns the appropriate AI provider.
 * Add new providers here without touching UI code.
 *
 * Future integrations:
 *   - openai: Use openai npm package with OPENAI_API_KEY
 *   - claude: Use @anthropic-ai/sdk with ANTHROPIC_API_KEY
 *   - gemini: Use @google/generative-ai with GEMINI_API_KEY
 *   - local: Point to a local Ollama/LM Studio endpoint
 */
export function getAIProvider(provider: AIProviderName = "mock"): AIProvider {
  switch (provider) {
    case "mock":
      return mockProvider;

    // Placeholder cases — implement when ready
    case "openai":
      throw new Error("OpenAI provider not yet configured. Set OPENAI_API_KEY.");
    case "claude":
      throw new Error("Claude provider not yet configured. Set ANTHROPIC_API_KEY.");
    case "gemini":
      throw new Error("Gemini provider not yet configured. Set GEMINI_API_KEY.");
    case "local":
      throw new Error("Local provider not yet configured. Set LOCAL_AI_ENDPOINT.");

    default:
      return mockProvider;
  }
}

export { mockProvider };
export type { AIProvider, AIProviderName };
