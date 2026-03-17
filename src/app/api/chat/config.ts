/**
 * Chat API Configuration
 *
 * Environment variables and configuration settings
 */

// AI Provider selection
export const PROVIDER = process.env.AI_PROVIDER || "openai";

// OpenAI configuration
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// NVIDIA NIM configuration
export const NIM_BASE_URL = process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
export const NIM_API_KEY = process.env.NIM_API_KEY;
export const NIM_MODEL = process.env.NIM_MODEL || "deepseek-ai/deepseek-r1";

// API Runtime configuration
export const RUNTIME = "nodejs";
export const MAX_DURATION = 60;

// Cache configuration
export const CACHE_TTL = 1000 * 60 * 30; // 30 minutes
