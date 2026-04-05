# 03. Master 调度协议与工具约束实施（全量重构）

## 1. 目标

将 `createSubAgent` 从自由任务输入改为模板化受约束调度，确保 master 不可越权生成 subagent 任务。

## 2. 影响范围

- `src/agents/master/tools/create-sub-agent.ts`
- `src/agents/master/index.ts`
- `src/agents/master/prompt.ts`
- `src/app/api/chat/handler-master.ts`
- `src/lib/agents/sub-agent/manager.ts`

## 3. 实施方案

### 3.1 工具输入升级（唯一协议）

新输入结构：

- `profileId`
- `templateId`
- `templateVars`
- `payloadRef`

删除旧输入协议：`task/startIndex/endIndex`。

### 3.2 master prompt 约束

更新 `master/prompt.ts`：

- 必须先选择已配置 `profileId/templateId`
- 仅填写模板变量
- 无可用模板时必须回退主流程或询问用户

### 3.3 调度前校验

`createSubAgent` execute 前必须校验：

1. profile 存在且启用
2. parent agent 在白名单
3. template 合法
4. vars 满足约束
5. payload 符合 limits

### 3.4 manager 元数据透传

`SubAgentManager.addTask` 必须保存：

- `parentAgentId`
- `profileId`
- `templateId`
- `profileVersion`
- `originTool`

### 3.5 运行时阻断策略

校验失败直接拒绝创建并返回明确错误码：

- `SUBAGENT_PROFILE_NOT_FOUND`
- `SUBAGENT_TEMPLATE_INVALID`
- `SUBAGENT_VARS_INVALID`
- `SUBAGENT_PAYLOAD_LIMIT_EXCEEDED`

## 4. 风险与对策

1. prompt 约束不稳定：以工具硬校验为准
2. 模板配置不足导致无法调度：设置页要求至少 1 个启用模板
3. 错误信息不明确：统一错误码 + 可读错误消息

## 5. 验收标准

1. master 不能提交任意自由 task
2. 所有创建任务都可追溯到 profile/template/version
3. 系统中不再接受旧 `createSubAgent` 输入结构
4. 错误可定位到 profile/template/vars/payload 级别
