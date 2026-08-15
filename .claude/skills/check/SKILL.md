---
name: check
description: 跑本仓库的语法检查（node --check + py_compile），然后输出本次改动对应的 YouTube 手测清单。在改完扩展代码、准备提交或交给用户验证前使用。
---

本仓库没有测试框架，浏览器行为无法自动验证。这个 skill 做两件事：跑能自动化的检查，然后把不能自动化的部分整理成用户可执行的清单。

## 1. 语法检查

```bash
npm run check && npm run lint
```

`npm run check` 是三个手写 JS 的 `node --check`；`npm run lint` 是 ESLint（配置在 `eslint.config.js`）。ESLint 能抓 `node --check` 抓不到的未定义变量和笔误的 chrome API 名。已知有 4 条 `popup.js` 的 unused-vars warning 属于既存问题，不是你引入的。

如果本次改动碰了 Python 文件，追加：

```bash
python -m py_compile build.py fix_ass.py
```

有报错先修掉再继续。不要跳过这一步直接写手测清单。

不要对 `ass-loader.js` 跑检查或做修改 —— 它是 `build.py` 生成的 vendored 产物，体积大且含私有字段语法。

## 2. 手测清单

根据本次实际改动的范围，从下面挑出相关项，写成用户可以照着做的步骤，每项带预期结果。**只列与本次改动相关的**，不要每次都把整张表抄一遍。

前置步骤（只要改了任何扩展文件就需要）：在 `chrome://extensions` 点击 yt-sub 的重新加载，然后刷新 YouTube 观看页。content script 只在页面加载时注入，不刷新页面改动不会生效。

- **ASS 加载** — 选一个 `.ass` 文件点加载，字幕按时间轴显示、位置和样式正常。
- **SRT 加载** — 选一个 `.srt` 文件点加载，字幕按时间轴显示。
- **清除字幕** — 点清除，字幕消失且控制台无报错。
- **连续切视频** — 在 YouTube 内连续点开 3 个以上视频（不刷新页面），每次都能正常加载字幕，控制台无重复监听或累积报错。这条能暴露 SPA 路由相关的监听器堆积问题。
- **全屏切换** — 进出全屏，字幕位置和缩放跟随视频。
- **设置持久化** — 调整弹窗里的设置，关闭再打开弹窗，值保持；刷新页面后仍生效。
- **注入防护** — 用含 `<script>`、HTML 标签和特殊字符的字幕文件测试，这些内容应当只作为纯文本显示。
- **构建产物** — 若改了 `build.sh`，从构建目录用「加载已解压的扩展程序」验证无缺失资源。

最后提醒用户查看浏览器控制台（观看页的 content script 上下文，以及 `chrome://extensions` 里 service worker 的日志）。

## 3. 提交

检查通过后，按 CLAUDE.md 的约定递增 `manifest.json` 版本号并提交本次涉及的文件。
