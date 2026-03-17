请你阅读这个项目，用户想实现一个根据 Github Star 的仓库来进行 AI 问答的 Agent，目的是让用户找到需要的仓库，下面是用户需求和任务等。

# 任务

- 深入分析用户需求，你有充足的时间去实现这些需求，你需要制定充足且清晰的规划。
- 阅读src\app\api\chat\route.ts，src\components\star\message-renderer.tsx，src\components\star\github-repo\index.tsx，src\lib\github\api.ts 等等有关于 Star Agent 的实现。
- 我想让你先分析 Star Agent 的实现逻辑和位置，然后我需要你分析如何将其从现在的耦合的情况下解耦出来，因为我想添加其他的 Agent，而用户可以在多个 Agent 之间进行选择。
- 有关 Star Agent 的逻辑可以单独放在 agents/star 文件夹下面。避免将项目其他的无关逻辑一并提取。

# 用户需求

- 需要能够在一个应用当中设置多个 Agent，并且代码可扩展，Agent 可扩展。

# 设计规范

- 页面设计简洁，大量留白体现优雅，高端。
- 使用动画实现丝滑过渡，避免出现无动画元素。
- 页面响应流畅，设计规范，符合UI、UX设计最佳实践。
- 无障碍设计符合最佳实践。

# 代码规范

- 代码应易于维护、模块化且具有易读性，模块、文件等应遵守功能的单一职责原则，避免在同一个文件当中堆砌功能无关的代码。
- 项目文件结构设计需要有架构设计，目录命名具有前瞻性以及功能命名意义，避免无意义，含糊的文件或文件夹命名。
- 将通用代码进行封装，在合适的环节或时机使用设计模式来提高扩展性和可维护性。
- 在合适的时候可以使用设计模式来提高扩展性和代码可维护性，但是避免过度设计。

# 约束

- 使用 Shadcn 组件库来实现目前的需求，目前安装的组件位于 src\components\ai-elements 和 src\components\ui，ai-elements 是专门用来编写 AI 交互页面的组件，后者是基础组件。
- 使用命令来安装对应的组件，而不是自己编写。
- 颜色不能使用固定的颜色值，使用 Shadcn 自带的颜色值，如果需要使用特定的颜色，需要使用 CSS 变量，这是 tailwindcss 推荐的形式。
- 日期处理使用 dayjs 来处理。
- 包管理器使用 bun。
- 检查错误时使用 lint 和 tsc 来检查。

# 注意

- 避免重复造轮子，src\components\ai-elements 和 src\components\ui 下面已经有许多 UI 组件。
- 在实现之前阅读相关的 Vercel AI SDK 的文档以获取相关的 API 参考。
