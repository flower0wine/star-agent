import { z } from "zod";
import { SubAgentConfigError } from "./profile-schema";

export type CreateSubAgentParamRole = "task" | "rangeStart" | "rangeEnd" | "runtimeVar";
export type CreateSubAgentParamType = "string" | "number" | "boolean";

export interface CreateSubAgentDynamicParameter {
  key: string;
  type: CreateSubAgentParamType;
  role?: CreateSubAgentParamRole;
  required?: boolean;
  description?: string;
  defaultValue?: string | number | boolean;
  constraints?: {
    min?: number;
    max?: number;
    enum?: Array<string | number | boolean>;
    pattern?: string;
  };
}

export interface CreateSubAgentDynamicParameterConfig {
  parameters: CreateSubAgentDynamicParameter[];
}

const PARAM_KEY_REGEX = /^[a-zA-Z_]\w*$/;
const RESERVED_RUNTIME_KEYS = new Set([
  "username",
  "repos_count",
  "repos_context",
  "parent_agent_id",
  "current_date",
]);

const dynamicParameterSchema = z.object({
  key: z.string().regex(PARAM_KEY_REGEX),
  type: z.enum(["string", "number", "boolean"]),
  role: z.enum(["task", "rangeStart", "rangeEnd", "runtimeVar"]).optional(),
  required: z.boolean().optional(),
  description: z.string().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  constraints: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
    pattern: z.string().optional(),
  }).optional(),
});

const parameterConfigSchema = z.object({
  parameters: z.array(dynamicParameterSchema).min(1),
});

function validateParameterSet(config: CreateSubAgentDynamicParameterConfig): void {
  const keySet = new Set<string>();
  let taskRoleCount = 0;

  for (const parameter of config.parameters) {
    if (keySet.has(parameter.key)) {
      throw new SubAgentConfigError(
        "SUBAGENT_DYNAMIC_PARAM_DUPLICATED",
        `动态参数存在重复 key: ${parameter.key}`
      );
    }
    keySet.add(parameter.key);

    if (parameter.role === "task") {
      taskRoleCount += 1;
      if (parameter.type !== "string") {
        throw new SubAgentConfigError(
          "SUBAGENT_DYNAMIC_PARAM_INVALID_TASK",
          `task 角色参数必须是 string 类型: ${parameter.key}`
        );
      }
      if (parameter.required !== true) {
        throw new SubAgentConfigError(
          "SUBAGENT_DYNAMIC_PARAM_INVALID_TASK",
          `task 角色参数必须为 required: ${parameter.key}`
        );
      }
    }

    if (parameter.role !== "task" && RESERVED_RUNTIME_KEYS.has(parameter.key)) {
      throw new SubAgentConfigError(
        "SUBAGENT_DYNAMIC_PARAM_RESERVED",
        `动态参数 key "${parameter.key}" 与预定义运行时变量冲突`
      );
    }
  }

  if (taskRoleCount !== 1) {
    throw new SubAgentConfigError(
      "SUBAGENT_DYNAMIC_PARAM_TASK_MISSING",
      "动态参数配置必须且仅能包含一个 role=task 的参数"
    );
  }
}

export const DEFAULT_CREATE_SUBAGENT_PARAMETERS: CreateSubAgentDynamicParameterConfig = {
  parameters: [
    {
      key: "task",
      type: "string",
      role: "task",
      required: true,
      description: "派发给 SubAgent 的任务描述",
    },
    {
      key: "startIndex",
      type: "number",
      role: "rangeStart",
      required: false,
      description: "仓库切片起始索引（可选）",
      constraints: { min: 0 },
    },
    {
      key: "endIndex",
      type: "number",
      role: "rangeEnd",
      required: false,
      description: "仓库切片结束索引（可选）",
      constraints: { min: 0 },
    },
  ],
};

export function resolveCreateSubAgentParameterConfig(raw: unknown): CreateSubAgentDynamicParameterConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_CREATE_SUBAGENT_PARAMETERS;
  }

  const parsed = parameterConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SubAgentConfigError(
      "SUBAGENT_DYNAMIC_PARAM_SCHEMA_INVALID",
      parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    );
  }

  validateParameterSet(parsed.data);
  return parsed.data;
}

function createFieldSchema(parameter: CreateSubAgentDynamicParameter): z.ZodTypeAny {
  let field: z.ZodTypeAny;
  if (parameter.type === "string") {
    field = z.string();
    if (parameter.constraints?.pattern) {
      field = (field as z.ZodString).regex(new RegExp(parameter.constraints.pattern));
    }
  } else if (parameter.type === "number") {
    field = z.number();
    if (parameter.constraints?.min !== undefined) {
      field = (field as z.ZodNumber).min(parameter.constraints.min);
    }
    if (parameter.constraints?.max !== undefined) {
      field = (field as z.ZodNumber).max(parameter.constraints.max);
    }
  } else {
    field = z.boolean();
  }

  if (parameter.constraints?.enum && parameter.constraints.enum.length > 0) {
    field = field.refine(value => parameter.constraints!.enum!.includes(value), {
      message: `must be one of: ${parameter.constraints.enum.join(", ")}`,
    });
  }

  if (parameter.defaultValue !== undefined) {
    field = field.default(parameter.defaultValue);
  }

  if (parameter.required !== true) {
    field = field.optional();
  }

  if (parameter.description) {
    field = field.describe(parameter.description);
  }

  return field;
}

export function buildCreateSubAgentInputSchema(config: CreateSubAgentDynamicParameterConfig): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const parameter of config.parameters) {
    shape[parameter.key] = createFieldSchema(parameter);
  }
  return z.object(shape);
}

export function buildCreateSubAgentToolDescription(config: CreateSubAgentDynamicParameterConfig): string {
  const rows = config.parameters.map((parameter) => {
    const requiredLabel = parameter.required ? "required" : "optional";
    const roleLabel = parameter.role ? ` role=${parameter.role}` : "";
    return `- ${parameter.key} (${parameter.type}, ${requiredLabel}${roleLabel})${parameter.description ? `: ${parameter.description}` : ""}`;
  });
  return [
    "使用预配置绑定的 SubAgent 创建异步子任务并执行。",
    "请根据以下参数定义调用：",
    ...rows,
  ].join("\n");
}

export interface ParsedCreateSubAgentInput {
  task: string;
  rangeStart?: number;
  rangeEnd?: number;
  runtimeParams: Record<string, string | number | boolean>;
}

export function parseCreateSubAgentExecutionInput(
  validatedInput: Record<string, unknown>,
  config: CreateSubAgentDynamicParameterConfig
): ParsedCreateSubAgentInput {
  let taskValue: string | undefined;
  let rangeStart: number | undefined;
  let rangeEnd: number | undefined;
  const runtimeParams: Record<string, string | number | boolean> = {};

  for (const parameter of config.parameters) {
    const rawValue = validatedInput[parameter.key];
    if (rawValue === undefined) {
      continue;
    }

    if (parameter.role === "task") {
      taskValue = rawValue as string;
      runtimeParams[parameter.key] = rawValue as string;
      continue;
    }

    if (parameter.role === "rangeStart") {
      rangeStart = rawValue as number;
    } else if (parameter.role === "rangeEnd") {
      rangeEnd = rawValue as number;
    }

    if (typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean") {
      runtimeParams[parameter.key] = rawValue;
    }
  }

  if (!taskValue || taskValue.trim().length === 0) {
    throw new SubAgentConfigError("SUBAGENT_DYNAMIC_PARAM_TASK_MISSING", "缺少任务参数（task role）");
  }

  return {
    task: taskValue,
    rangeStart,
    rangeEnd,
    runtimeParams,
  };
}
