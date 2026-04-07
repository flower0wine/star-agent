export function mergeToolDefaultInput(
  defaults: Record<string, unknown>,
  input: unknown
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...defaults };
  if (!input || typeof input !== "object") {
    return merged;
  }

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

export function validateDefaultInputWithSchema(
  schema: unknown,
  input: Record<string, unknown>
): {
  valid: boolean;
  normalized?: Record<string, unknown>;
  error?: string;
} {
  const maybeSchema = schema as {
    safeParse?: (value: unknown) => { success: boolean; data?: unknown; error?: { issues?: Array<{ message: string }> } };
  };

  if (typeof maybeSchema.safeParse !== "function") {
    return { valid: true, normalized: input };
  }

  const parsed = maybeSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error?.issues?.[0]?.message || "Invalid default input";
    return { valid: false, error: issue };
  }

  return { valid: true, normalized: (parsed.data || input) as Record<string, unknown> };
}

