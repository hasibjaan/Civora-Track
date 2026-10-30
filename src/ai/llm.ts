import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { TextCompleter } from "./analyze";

const AI_MODEL = "claude-opus-5-5";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_TOKENS = 300;

/**
 * Creates a completer that calls Claude. Returns null when no API key is configured,
 * so the app runs on rules alone. Errors never throw: they log the failure type and
 * return null, so a flaky network cannot block a citizen's submission.
 */
export function createAiCompleter(apiKey: string | undefined): TextCompleter | null {
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: REQUEST_TIMEOUT_MS });

  return async (system, user) => {
    try {
      const message = await client.messages.create({
        model: AI_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { effort: "low" },
      });

      return message.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("");
    } catch (error) {
      // Log what went wrong, never the report text or the key.
      console.warn("AI analysis unavailable, using rules instead.", describeError(error));
      return null;
    }
  };
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIError) return `HTTP ${error.status ?? "unknown"}`;
  return "network error or timeout";
}
