# Master/SubAgent 通用化方案（用户定义版）

> 状态：提案（按最新需求修订）  
> 更新时间：2026-04-05

## 1. 核心定位

SubAgent 不是代码内置的固定 Agent，而是**用户在设置中定义的可复用配置实体**：

- 用户可创建/编辑/复制/删除 SubAgent Profile
- 用户可为 Profile 配置：tools、system prompt 模板、任务模板、变量定义、限制策略
- 运行时只做“装配 + 校验 + 执行”，不写死能力

## 2. 设计原则

1. 用户定义优先：能力来源于用户配置，不来源于 master 硬编码。
2. 模板驱动调度：master 只能选择模板并填写变量。
3. 严格变量解析：仅支持 `{{var}}` 占位符，不允许任意表达式执行。
4. 可复用：profile/template 可复制并跨会话复用。
5. 可审计：每次任务记录 profile/template/version/vars 快照。

## 3. 用户可配置模型

建议存储位置：`dynamicConfig.customParams.subAgentProfiles`

```ts
interface SubAgentProfile {
  id: string;
  name: string;
  enabled: boolean;
  parentAgentIds: string[];
  toolIds: string[];
  systemPromptTemplate: string;
  templates: SubAgentTaskTemplate[];
  varSchema: Record<string, SubAgentVarDef>; // 变量定义
  limits: {
    maxConcurrency: number;
    timeoutMs: number;
    maxInputItems?: number;
  };
  version: number;
}

interface SubAgentTaskTemplate {
  id: string;
  name: string;
  instructionTemplate: string;
  requiredVars: string[];
  allowedVars: string[];
}

interface SubAgentVarDef {
  type: "string" | "number" | "boolean";
  required?: boolean;
  defaultValue?: string | number | boolean;
  description?: string;
}
```

## 4. `{{var}}` 变量解析规则

### 4.1 语法

- 占位符格式：`{{varName}}`
- `varName` 规则：`[a-zA-Z_][a-zA-Z0-9_]*`
- 不支持函数、表达式、条件、循环（避免不可控）

### 4.2 变量来源优先级

1. 调度请求 `templateVars`
2. profile `varSchema.defaultValue`
3. 内置上下文变量（如 `username`、`repo_count`）

### 4.3 校验

1. 模板中引用的变量必须存在于 `allowedVars ∪ 内置变量`
2. `requiredVars` 必须有值
3. 值类型必须符合 `varSchema`
4. 渲染后不得残留 `{{...}}`

### 4.4 失败行为

- 任一校验失败，直接拒绝任务创建
- 返回结构化错误：`SUBAGENT_VAR_MISSING / SUBAGENT_VAR_TYPE_INVALID / SUBAGENT_VAR_UNKNOWN`

## 5. master 的职责边界

master 只做：

1. 选择 profile
2. 选择 template
3. 提交 vars

master 不做：

1. 自由拼接 subagent prompt
2. 动态扩展 subagent tool 权限
3. 绕过模板直接下发任务文本

## 6. 运行时引擎职责

1. 读取用户配置 profile/template
2. 做 schema + 变量 + 限制校验
3. 根据 `toolIds` 动态构建 tool map
4. 渲染 prompt / instruction
5. 执行并输出元数据（profileId/templateId/version）

## 7. Settings 需要支持的能力

1. Profile CRUD（创建、复制、删除、启停）
2. 模板 CRUD（支持复制模板）
3. Tool 白名单选择
4. Prompt 模板编辑
5. 变量 schema 编辑（类型、默认值、必填）
6. 实时预览：输入 vars 后预览渲染结果

## 8. 全量重构约束（开发环境）

1. 删除旧 `createSubAgent(task,startIndex,endIndex)` 协议
2. 删除旧 `tool-createSubAgent` 专用解析
3. 删除旧 subagent 历史数据与旧配置结构

## 9. 风险与对策

1. 用户配置过于自由导致失败率高：加强表单校验与预览。
2. 模板变量命名混乱：提供变量字典与自动补全。
3. 工具组合不合法：保存时做依赖校验。

## 10. 关键改造文件

- `src/lib/agents/sub-agent/types.ts`
- `src/lib/agents/sub-agent/executor.ts`
- `src/lib/agents/sub-agent/manager.ts`
- `src/lib/agents/sub-agent/profile-schema.ts`（新增）
- `src/lib/agents/sub-agent/template-renderer.ts`（新增）
- `src/agents/master/tools/create-sub-agent.ts`
- `src/components/app/settings/agent-settings.tsx`
- `src/components/chat/message-renderer.tsx`
- `src/lib/chat/sub-agent-history.ts`
