# 04 - 编剧介入与串行对话状态机

## 1. 核心状态机

新增 `RoomEngine` 状态机（建议）：

1. `idle`：等待触发下一轮。
2. `character_turn`：当前角色发言。
3. `playwright_review`：累计 100 轮后编剧介入。
4. `paused`：异常或人工暂停。

状态转移：

1. `idle -> character_turn`
2. `character_turn -> idle`（未达到 100）
3. `character_turn -> playwright_review`（达到 100）
4. `playwright_review -> idle`

## 2. 串行轮转策略

新增 `turn-policy.ts`：

1. 角色列表固定顺序（可在设置中调整）。
2. 每轮从上次发言角色的下一个开始。
3. 严禁并行触发多个角色。
4. 轮转信息持久化到 room state（避免刷新后乱序）。

建议字段：

```ts
interface RoomTurnState {
  totalCharacterTurnsInCycle: number; // 0..100
  lastSpeakerCharacterId?: string;
  cycleNo: number;
  nextPhase: "character" | "playwright";
}
```

## 3. 编剧介入策略

新增 `playwright-policy.ts`：

1. 触发条件：`totalCharacterTurnsInCycle >= 100`。
2. 输入：
   1. 当前共享消息窗口。
   2. 当前世界观提示词。
   3. 角色提示词全集。
3. 输出：
   1. 修订后的世界观提示词。
   2. 每个角色修订后的提示词。
   3. 修订理由摘要（可展示在 UI）。

## 4. 提示词修订协议

建议把编剧输出限定为结构化 JSON，避免自然语言难以解析：

```ts
interface PlaywrightRevision {
  cycleNo: number;
  worldPrompt: string;
  characterPromptPatches: Array<{
    characterId: string;
    prompt: string;
  }>;
  rationale: string;
  createdAt: string;
}
```

执行流程：

1. 解析编剧 JSON 输出。
2. 校验所有角色是否覆盖。
3. 原子写入“当前生效提示词快照”。
4. 清零 `totalCharacterTurnsInCycle` 并进入下个周期。

## 5. 角色人格唯一性保障

为防止角色风格塌缩，建议在角色系统提示词模板固定包含：

1. 角色动机（核心欲望）
2. 价值冲突（不可让步点）
3. 语言风格（句式、节奏、禁用词）
4. 行动偏好（主动/保守、策略类型）
5. 与其他角色关系张力

编剧修订时只能在这些槽位内改写，避免无限发散导致不可控。

## 6. 失败与降级

## 6.1 编剧失败

1. 如果编剧轮次失败，保持上一版提示词继续对话。
2. 记录失败事件并允许手动重试编剧轮次。

## 6.2 角色失败

1. 当前角色失败时可重试一次。
2. 连续失败超过阈值进入 `paused`，等待人工处理。

## 7. 可观测性建议

建议新增 room 级指标：

1. 每轮耗时（按角色）
2. 编剧修订成功率
3. 每周期 token 消耗
4. 角色发言长度分布（检测风格退化）

时间字段统一使用 dayjs 产生 ISO 字符串，和现有项目保持一致。
