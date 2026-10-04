# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目性质

Chrome Manifest V3 扩展，给 YouTube 视频叠加 ASS/SRT 字幕。**扩展本身零依赖**，没有构建工具、没有测试框架。`package.json` 和 `node_modules` 只用于 ESLint 这类开发工具，不随扩展发布 —— 不要为了小改动引入 bundler 或运行时依赖。

## 验证流程

改完代码后按顺序做：

1. `npm run check`（等价于对两个手写 JS 跑 `node --check`）
2. `npm run lint`（ESLint，抓未定义变量、笔误的 chrome API 名、未使用变量）
3. 语法检查和 lint 只能证明代码能解析且无静态错误，**不能证明行为正确**。浏览器行为无法自动验证，所以每次改动后要列出具体的手测步骤和预期结果，交给用户在 chrome://extensions 重新加载扩展后在 YouTube 观看页验证。不要声称已验证运行时行为。

手测清单覆盖：ASS 加载、SRT 加载、清除字幕、连续切换多个视频、全屏切换、设置持久化、控制台无报错。

## 版本号与提交

- 每次影响行为的改动都递增 `manifest.json` 的 `version`（patch 位），保持与提交一致。
- 提交信息用 Conventional Commits 格式：`<type>(<scope>): <subject>`，type 取 `feat`/`fix`/`refactor`/`docs`/`chore`/`build` 等，scope 可选（如 `content`、`popup`、`build`），subject 用简短祈使句。版本递增写在正文里，如 `Bump version to 1.3.4`。早于 v1.3.4 的历史是 `Update to vX.Y.Z` 旧格式，不要改写。
- 完成一处逻辑完整的修改并通过上述语法检查后，直接 `git add` 本次涉及的文件并提交，不用逐次询问。只 stage 相关文件，不要 `git add .`。
- 不要提交 `*.pem`、`*.crx`、`*.zip` 或被 ignore 的构建目录。

## 生成文件与死代码

- `ass-loader.js` 是从 assjs 官方非模块构建 `dist/ass.global.js` 复制来的 vendored 产物（定义全局 `var ASS`），**不要手工编辑**。版本锁在 `package.json` 的 `assjs` devDependency；升级时改版本号，跑 `npm install && npm run vendor`，审查 diff。许可证在 `ass-loader.LICENSE`，两个文件要一起更新、一起发布。
- assjs 的 `resize` 是私有字段 `#resize`，实例上没有公开 `resize()`。库在构造时自己装了 `ResizeObserver`，尺寸变化已有人管。
- 扩展里手写的 JS 只有 `content.js` 和 `popup.js`；`scripts/` 下是不随扩展发布的开发脚本。没有 background service worker —— MV3 不强制要求，且设了 `default_popup` 时 `action.onClicked` 永远不触发，所有逻辑都在 popup 和 content script 里。
- `yt-sub/`、`yt-sub-build/` 是本地构建或备份输出，不是源码。

## 代码风格

四空格缩进；JavaScript 用分号；函数和变量 `camelCase`，类 `PascalCase`，模块级常量 `UPPER_SNAKE_CASE`。Chrome 消息的 action 名要有描述性，如 `loadSubtitle`、`updateSettings`。ESLint 只查静态错误，没有配置 formatter，所以格式上保持与邻近代码一致。

## 安全约束

字幕内容是不可信输入。渲染 SRT 文本必须用 `textContent` 逐行创建元素再 `replaceChildren()`，不要用 `innerHTML` 拼接 —— 正则过滤标签不能可靠防止 HTML 注入。
