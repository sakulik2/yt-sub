# YouTube ASS字幕播放器

一个Chrome浏览器扩展插件，支持在YouTube视频中加载和渲染.ass格式的字幕文件，支持调用用户本地字体。

## 功能特性

- ✅ 支持.ass字幕文件加载
- ✅ 使用assjs库进行高质量字幕渲染
- ✅ 支持调用本地系统字体
- ✅ 可调节字体大小、透明度和垂直偏移
- ✅ 支持YouTube全屏和剧院模式
- ✅ 自动适应视频尺寸
- ✅ 实时字幕同步

## 安装步骤

### 1. 准备项目文件

将所有提供的文件放在同一个文件夹中：

```
youtube-ass-player/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── content.css
├── background.js
├── package.json
└── README.md
```

### 2. 下载assjs库

在项目文件夹中运行以下命令：

```bash
# 安装依赖
npm install

# 构建项目（下载assjs库）
npm run build
```

或者手动下载：

```bash
# 直接下载assjs库
curl -o assjs.min.js https://cdn.jsdelivr.net/npm/assjs@latest/dist/ass.min.js
```

### 3. 加载扩展到Chrome

1. 打开Chrome浏览器
2. 进入 `chrome://extensions/`
3. 开启"开发者模式"（右上角切换开关）
4. 点击"加载已解压的扩展程序"
5. 选择包含所有文件的项目文件夹
6. 扩展安装完成！

## 使用方法

### 1. 打开YouTube视频

导航到任何YouTube视频页面（例如：`https://www.youtube.com/watch?v=...`）

### 2. 加载字幕文件

1. 点击浏览器工具栏中的扩展图标
2. 在弹出的界面中点击"选择文件"
3. 选择你的.ass字幕文件
4. 点击"加载字幕"按钮

### 3. 调整字幕设置

在扩展弹窗中可以调整：

- **字体大小**：12px - 36px
- **透明度**：30% - 100%
- **垂直偏移**：-100px 到 +100px

设置会自动保存并实时生效。

### 4. 清除字幕

点击"清除字幕"按钮可以移除当前加载的字幕。

## 支持的字体

扩展会自动检测和使用系统中可用的字体，优先支持：

- Microsoft YaHei（微软雅黑）
- SimHei（黑体）
- SimSun（宋体）
- KaiTi（楷体）
- PingFang SC
- Source Han Sans CN
- Noto Sans CJK SC

## 文件结构说明

- `manifest.json` - 扩展配置文件
- `popup.html/js` - 扩展弹出界面
- `content.js` - 注入YouTube页面的主要逻辑
- `content.css` - 字幕样式文件
- `background.js` - 后台服务脚本
- `assjs.min.js` - ASS字幕渲染库

## 常见问题

### Q: 字幕不显示？

A: 请检查：
1. 是否在YouTube视频页面
2. .ass文件格式是否正确
3. 尝试刷新页面后重新加载字幕

### Q: 字幕位置不对？

A: 使用扩展弹窗中的"垂直偏移"设置调整字幕位置。

### Q: 字体显示异常？

A: 扩展会自动使用系统字体，如果显示异常，请确保系统中安装了中文字体。

### Q: 扩展图标是灰色的？

A: 只有在YouTube视频页面（watch页面）扩展才会激活。

## 技术实现

- **Manifest V3** - 使用最新的Chrome扩展API
- **ASS.js** - 专业的ASS/SSA字幕渲染引擎
- **Font API** - 调用系统本地字体
- **Content Scripts** - 注入YouTube页面进行字幕渲染
- **Storage API** - 保存用户设置和偏好

## 开发说明

### 本地开发

```bash
# 克隆或下载项目文件
git clone <your-repo>
cd youtube-ass-player

# 安装依赖
npm install

# 开发构建
npm run dev

# 打包发布版本
npm run package
```

### 调试模式

1. 在Chrome扩展管理页面开启"开发者模式"
2. 加载解压的扩展程序
3. 打开Chrome开发者工具查看console输出
4. 修改代码后点击扩展的"刷新"按钮

### 文件说明

#### manifest.json
定义了扩展的基本信息、权限和资源：
- `permissions`: 需要的API权限
- `content_scripts`: 注入到YouTube页面的脚本
- `web_accessible_resources`: 可被网页访问的资源

#### content.js
主要逻辑文件，负责：
- 检测YouTube视频元素
- 创建字幕容器
- 处理ASS字幕渲染
- 与popup界面通信

#### popup界面
提供用户交互界面：
- 文件选择和加载
- 字幕设置调节
- 状态反馈显示

## 扩展功能

### 已实现功能

- [x] ASS字幕文件加载
- [x] 实时字幕渲染
- [x] 字体大小调节
- [x] 透明度控制
- [x] 垂直位置调整
- [x] 本地字体支持
- [x] 设置持久化保存
- [x] YouTube页面自动适配

### 计划功能

- [ ] SRT字幕格式支持
- [ ] 字幕搜索和跳转
- [ ] 多语言字幕切换
- [ ] 字幕样式自定义
- [ ] 快捷键支持
- [ ] 字幕下载功能

## 兼容性

- **Chrome**: 88+
- **Edge**: 88+
- **Opera**: 74+
- **其他Chromium内核浏览器**

## 许可证

MIT License - 详见LICENSE文件

## 贡献

欢迎提交Issue和Pull Request！

### 贡献指南

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 更新日志

### v1.0.0
- 初始版本发布
- 支持ASS字幕加载和渲染
- 基础字幕设置功能
- 本地字体支持

## 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues: [项目Issues页面]
- Email: [your-email@example.com]

## 鸣谢

- [ASS.js](https://github.com/weizhenye/ASS) - 优秀的ASS字幕渲染库
- YouTube - 提供平台支持
- Chrome Extensions - 强大的扩展API