# SubAgent 配置优先化实施总览（用户定义版）

## 1. 总目标

建立“用户定义 SubAgent”的执行体系：用户直接配置并复用 profile/template/tool/prompt/vars，系统仅负责校验和执行。

## 2. 文档拆分

1. `01-config-model.md`：用户配置模型与变量 schema
2. `02-runtime-executor.md`：运行时装配与 `{{var}}` 渲染
3. `03-master-dispatch.md`：master 受限调度协议
4. `04-settings-ui.md`：配置与复用 UI
5. `05-frontend-protocol-migration.md`：前端协议统一与全量清理

## 3. 全局约束

1. subagent 能力不在代码中固定
2. master 不能跳过模板
3. 仅允许 `{{var}}` 占位符解析
4. profile/template/version 必须入任务元数据
5. 开发环境允许删除旧配置和旧历史数据
