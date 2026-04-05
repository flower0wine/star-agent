# 01. 配置模型与存储实施（全量重构）

## 1. 目标

建立可持久化、可校验、可审计的 SubAgent Profile 配置模型，为运行时组装提供唯一可信输入。

## 2. 影响范围

- `src/lib/storage/db.ts`
- `src/lib/storage/agent-config-storage.ts`
- `src/lib/storage/index.ts`
- `src/lib/agents/sub-agent/types.ts`
- `src/hooks/use-agent-config.ts`
- `src/stores/agent-config-store.ts`

## 3. 实施方案

### 3.1 新增类型

在 `src/lib/agents/sub-agent/types.ts` 新增：

- `SubAgentProfile`
- `SubAgentTaskTemplate`
- `SubAgentPolicyConfig`
- `SubAgentTaskPayloadRef`

并扩展 `SubAgentTask`：

- `profileId: string`
- `templateId: string`
- `templateVars: Record<string, string | number | boolean>`
- `profileVersion: number`
- `parentAgentId: string`
- `originTool: string`

### 3.2 配置落点

统一落到：

- `dynamicConfig.customParams.subAgentProfiles`
- `dynamicConfig.customParams.subAgentPolicy`

### 3.3 配置校验器

新增校验模块（建议 `src/lib/agents/sub-agent/profile-schema.ts`）：

- 校验 profile id 唯一
- 校验 toolIds 在 `TOOL_CATALOG` 中存在
- 校验 template 变量闭合、`requiredVars ⊆ allowedVars`
- 校验 limits 数值范围
- 校验 `parentAgentIds` 非空

保存配置前执行校验，失败返回结构化错误。

### 3.4 开发环境重置

直接清理旧数据：

- 清空 `agentConfigs` 中旧 subagent 相关字段
- 删除历史会话中的旧 subagent 片段（如 `tool-createSubAgent`）
- 初始化新 profile 基线配置

## 4. 关键决策

1. 配置写入时即校验，读取时再校验
2. `profileVersion` 强制随 profile 变更递增
3. 不做旧数据兼容分支

## 5. 风险与对策

1. 配置模型升级导致空配置：初始化阶段强制创建基线 profile
2. tool registry 变更导致配置失效：启动时执行全量校验并阻断不可用 profile
3. 脏数据写入：仅允许通过 schema 校验入口写入

## 6. 验收标准

1. 可以在 runtime 拿到结构化 profile 列表
2. 非法配置无法保存
3. 新 task 都带 `profileId/templateId/profileVersion`
4. 系统不依赖任何旧 subagent 配置或旧消息格式
