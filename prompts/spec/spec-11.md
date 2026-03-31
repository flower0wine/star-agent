请你阅读这个项目，下面是用户需求和任务等。

# 任务

- 深入分析用户需求，你有充足的时间去实现这些需求，你需要制定充足且清晰的规划。
- 查看 src\app\chat\[[...conversationId]]\page.tsx，src\components\agents\master\sub-agent-panel.tsx，分析有关的代码。
- 你可以重构这部分代码，让其结构清晰，易于维护。

# 需求

- 要求 subagent panel 的布局改为左右分栏布局，左侧是subagent列表，点击之后右侧展示subagent的消息内容。
- 然后 subagent 的标题展示 subagent的id即可，不用展示它的任务。
- 然后去掉 subagent 的进度有关的功能，这个几乎没有作用。
- 然后去掉仓库数量的展示，这个 subagent 应该设计为通用的 subagent 面板 UI，因为 subagent 不只是查找 star 仓库，需要考虑其扩展性。

# 代码规范

- 代码应易于维护、模块化且具有易读性。模块、文件等应遵守功能的单一职责原则，避免在同一个文件当中堆砌功能无关的代码。
- 项目文件结构设计需要有架构设计，目录命名具有前瞻性以及功能命名意义，避免无意义，含糊的文件或文件夹命名。
- 将通用代码进行封装，在合适的环节或时机使用设计模式来提高扩展性和可维护性。
- 在合适的时候可以使用设计模式来提高扩展性和代码可维护性，但是避免过度设计。

# 约束

- 颜色不能使用固定的颜色值，使用 Shadcn 自带的颜色值，如果需要使用特定的颜色，需要使用 CSS 变量，这是 tailwindcss 推荐的形式。
- 日期处理使用 dayjs 来处理。
- 包管理器使用 bun。
- 检查错误时使用 lint 和 tsc 来检查。

# 注意

- src\app\layout.tsx 是项目的入口。
- 再创建新的基础 UI 组件前，查看 src\components\ai-elements 和 src\components\ui，已经有许多 UI 组件。ai-elements 是专门用来编写 AI 交互页面的组件，后者是基础组件。
- 不清楚的 API 阅读相关的 Vercel AI SDK 的文档（https://ai-sdk.dev/）以获取相关的 API 参考文档。
- 当遇到方向性问题时需要告知我，比如因为实现困难导致更改方向。但是一些文件命名不需要告知我。
