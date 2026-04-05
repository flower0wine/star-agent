# 04. Settings 配置界面实施（用户定义与复用）

## 1. 目标

让用户直接创建、复用、复制 SubAgent Profile 与模板，并配置 prompt/tool/vars。

## 2. 影响范围

- `src/components/app/settings/agent-settings.tsx`
- `src/components/app/settings/agent-settings/*`（新增子组件）

## 3. 实施方案

### 3.1 功能模块

新增 UI：

- Profile 列表（创建、复制、删除、启停）
- 模板列表（创建、复制、删除）
- 工具选择器（多选）
- System Prompt 模板编辑器
- 变量 Schema 编辑器（类型、默认值、必填）
- 模板变量预览器（输入 vars -> 即时渲染）

### 3.2 复用能力

- 支持“复制 profile 生成新 profile”
- 支持“复制模板到当前 profile”
- 可选 profile library（用户私有）

### 3.3 保存规则

保存前必须通过：

1. schema 校验
2. 变量引用校验
3. 工具依赖校验

## 4. 风险与对策

1. 误配导致运行失败：编辑页给实时错误提示。
2. 配置过多难管理：支持搜索/标签/最近使用。

## 5. 验收标准

1. 用户可独立完成 profile/template 的创建与复用
2. prompt/tool/vars 均由用户配置，不由代码写死
3. 预览区能正确渲染 `{{var}}`
