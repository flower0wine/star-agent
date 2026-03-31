/**
 * Model Provider
 *
 * Factory functions for creating AI model instances based on configuration
 */

import { createOpenAI, openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getProviderDetails } from "@/lib/models/catalog";
import type { ChatModelConfigPayload } from "./types";
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
    ...(isMiniMax && {
      extraBody: {
        reasoning_split: true,
      },
    }),
  });
}

function getSupportsReasoning(modelId: string) {
  const normalized = modelId.toLowerCase();
  return normalized.includes("o1")
    || normalized.includes("o3")
    || normalized.includes("reason")
    || normalized.includes("r1")
    || normalized.includes("thinking");
}

function getLegacyModel(): ModelInstance {
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
 * Get the model based on request selection.
 * Falls back to legacy env-based provider when selection is not provided.
 */
export async function getModel(config?: ChatModelConfigPayload): Promise<ModelInstance> {
  if (!config?.providerId || !config.modelId) {
    return getLegacyModel();
  }

  const provider = await getProviderDetails(config.providerId);

  if (!provider) {
    throw new Error(`Provider not found: ${config.providerId}`);
  }

  const requestedModel = provider.models.find((model) => model.id === config.modelId);
  if (!requestedModel) {
    throw new Error(`Model not found for provider ${config.providerId}: ${config.modelId}`);
  }

  const supportsReasoning = requestedModel.reasoning ?? getSupportsReasoning(requestedModel.id);

  if (provider.id === "openai") {
    const openaiProvider = createOpenAI({
      apiKey: config.apiKey,
    });

    return {
      model: openaiProvider(config.modelId),
      supportsReasoning,
    };
  }

  if (!provider.api) {
    throw new Error(`Provider ${provider.name} does not expose an OpenAI-compatible API endpoint.`);
  }

  const compatibleProvider = createOpenAICompatible({
    name: provider.id,
    baseURL: provider.api,
    apiKey: config.apiKey,
  });

  return {
    model: compatibleProvider.chatModel(config.modelId),
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
