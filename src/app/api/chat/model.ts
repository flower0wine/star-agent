/**
 * Model Provider
 *
 * Factory functions for creating AI model instances based on configuration
 */

import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { PROVIDER, OPENAI_MODEL, NIM_BASE_URL, NIM_API_KEY, NIM_MODEL } from "./config";

// Using any type for model instance (AI SDK types are complex)
export interface ModelInstance {
  model: any;
  supportsReasoning: boolean;
}

/**
 * Create NVIDIA NIM provider
 */
function getNvidiaProvider() {
  if (!NIM_API_KEY) {
    throw new Error("NIM_API_KEY environment variable is not set");
  }

  const isMiniMax = NIM_MODEL.includes("minimax");

  return createOpenAICompatible({
    name: "nim",
    baseURL: NIM_BASE_URL,
    headers: {
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    // MiniMax 需要 reasoning_split 来分离思考内容
    ...(isMiniMax && {
      extraBody: {
        reasoning_split: true,
      },
    }),
  });
}

/**
 * Get the model based on provider configuration
 * Returns model instance and whether it supports reasoning
 */
export function getModel(): ModelInstance {
  const supportsReasoning
    = PROVIDER === "nvidia"
      ? NIM_MODEL.includes("r1") || NIM_MODEL.includes("reasoning")
      : OPENAI_MODEL.includes("o1") || OPENAI_MODEL.includes("o3");

  if (PROVIDER === "nvidia") {
    const nim = getNvidiaProvider();
    return {
      model: nim.chatModel(NIM_MODEL),
      supportsReasoning,
    };
  }

  // Default to OpenAI
  return {
    model: openai(OPENAI_MODEL),
    supportsReasoning,
  };
}

/**
 * Get model info for API status response
 */
export function getModelInfo() {
  if (PROVIDER === "nvidia") {
    return { provider: "nvidia", model: NIM_MODEL, baseUrl: NIM_BASE_URL };
  }
  return { provider: "openai", model: OPENAI_MODEL };
}
