// YouTube ASS/SRT字幕播放器 Content Script (Final Fix)
class YouTubeSubtitlePlayer {
    constructor() {
        this.assInstance = null;
        this.srtSubtitles = null;
        this.srtContainer = null;
        this.video = null;
        this.container = null;
        this.currentSubtitleType = null;
        this.animationFrame = null;

        // 生命周期状态：这些字段保证监听器只注册一次，避免 SPA 跳转时堆积
        this.routeObserver = null;   // 路由变化观察器，全局只建一个
        this.pollTimer = null;       // 等待 video 元素的轮询计时器
        this.boundVideo = null;      // 当前已绑定事件的 video 元素
        this.lastSRTText = null;     // 上一帧渲染的 SRT 文本，用于跳过重复渲染

        // 事件处理器保存成实例字段，才能在 removeEventListener 时传入同一引用
        this.onVideoResize = () => this.applySettings();
        this.onFullscreenChange = () => {
            // 全屏切换后容器尺寸更新有延迟，补两拍
            setTimeout(this.onVideoResize, 100);
            setTimeout(this.onVideoResize, 500);
        };


        this.settings = {
            fontSize: 20,
            opacity: 1,
            offsetY: 0,
            // SRT Settings
            srtFontFamily: 'Microsoft YaHei, SimHei, Arial, sans-serif',
            srtFontWeight: 'normal',
            srtFontStyle: 'normal',
            srtTextAlign: 'center',
            srtBackgroundColor: '#000000',
            srtBackgroundOpacity: 0.7,
            srtTextColor: '#ffffff',
            srtOutlineColor: '#000000',
            srtOutlineWidth: 1,
            srtLineHeight: 1.2,
            srtPadding: 8
        };
        
        this.init();
    }

    init() {
        console.log("YouTube Subtitle Player 初始化...");
        
        // 检查全局 ASS 变量
        if (window.ASS) {
            console.log("✅ 检测到全局 ASS 库 (window.ASS)");
        } else {
            console.warn("⚠️ window.ASS 尚未就绪，将在使用时再次检查");
        }

        this.waitForVideo();
        this.watchRouteChanges();  // 只在初始化时注册一次

        // 全屏事件绑在 document 上，与具体 video 元素无关，注册一次即可
        document.addEventListener('fullscreenchange', this.onFullscreenChange);

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // 必须返回 true 以支持异步 sendResponse
            this.handleMessage(request, sender, sendResponse);
            return true;
        });

        this.loadSettings();
    }

    // 路由监听（处理 YouTube 的 SPA 页面内跳转）。
    // YouTube 切视频不重新加载文档，content script 不会重新注入，
    // 所以要自己观察 URL 变化。这个 observer 全局只建一个。
    watchRouteChanges() {
        if (this.routeObserver) return;

        let currentUrl = location.href;
        this.routeObserver = new MutationObserver(() => {
            if (location.href === currentUrl) return;
            currentUrl = location.href;
            if (currentUrl.includes('/watch')) {
                // 换视频了，旧字幕和旧 ASS 实例必须先释放
                this.clearSubtitle();
                setTimeout(() => this.waitForVideo(), 1000);
            }
        });
        this.routeObserver.observe(document, { subtree: true, childList: true });
    }

    waitForVideo() {
        // 取消上一轮未完成的轮询，避免多条轮询链并行
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }

        const checkVideo = () => {
            this.video = document.querySelector('video.html5-main-video');
            const playerContainer = document.querySelector('#movie_player');

            if (this.video && playerContainer) {
                this.pollTimer = null;
                this.setupContainer(playerContainer);
                this.setupVideoEventListeners();
            } else {
                this.pollTimer = setTimeout(checkVideo, 1000);
            }
        };

        checkVideo();
    }

    setupContainer(playerContainer) {
        // 重建容器前先释放字幕实例，否则旧 ASS 实例仍持有已被移除的 DOM
        this.clearSubtitle();
        if (this.container) this.container.remove(); // 清理旧容器

        this.container = document.createElement('div');
        this.container.id = 'subtitle-container';
        // 确保容器覆盖视频且不阻挡点击
        this.container.style.cssText = `
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none; z-index: 1000; overflow: hidden;
        `;
        playerContainer.appendChild(this.container);
    }
    
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'loadSubtitle':
                    await this.loadSubtitle(request.content, request.fileName, request.type);
                    sendResponse({ success: true });
                    break;
                case 'clearSubtitle':
                    this.clearSubtitle();
                    sendResponse({ success: true });
                    break;
                case 'updateSettings':
                    this.updateSettings(request.settings);
                    sendResponse({ success: true });
                    break;
                case 'getSubtitleStatus':
                    sendResponse({ success: true, type: this.currentSubtitleType, hasSubtitle: !!this.currentSubtitleType });
                    break;
            }
        } catch (error) {
            console.error('Subtitle Error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async loadSubtitle(content, fileName, type) {
        if (!this.video || !this.container) throw new Error('视频播放器未就绪');
        
        this.clearSubtitle(); // 加载新字幕前清理旧的
        
        if (type === 'srt') {
            return this.loadSRTSubtitle(content);
        } else if (type === 'ass') {
            return this.loadASSSubtitle(content);
        }
    }

    async loadASSSubtitle(assContent) {
        if (!window.ASS) {
            throw new Error('ASS 库加载失败(window.ASS missing)，请刷新页面重试');
        }

        console.log("正在初始化 ASS 引擎...");

        const assConfig = {
            container: this.container, // 渲染目标
            resampling: 'video_height', // 保持清晰度
            // 字体回退
            fallbackFont: 'Microsoft YaHei, sans-serif'
        };
        
        try {
            // 初始化
            this.assInstance = new window.ASS(assContent, this.video, assConfig);
            this.currentSubtitleType = 'ass';
            
            // 打印实例看看它到底有什么方法
            console.log("ASS 实例创建成功:", this.assInstance);

            this.applySettings();
            return true;
        } catch (e) {
            console.error("ASS 实例化抛出异常:", e);
            throw e;
        }
    }

    // ASS 库自己在构造时装了 ResizeObserver，尺寸变化由它负责（resize 是私有字段 #resize，
    // 实例上没有公开方法可调）。这里只需要重算依赖窗口高度的 SRT 位置。
    setupVideoEventListeners() {
        if (!this.video) return;
        if (this.boundVideo === this.video) return;  // 同一元素不重复绑定

        // 切视频后 video 元素可能被替换，先从旧元素上摘掉监听器
        if (this.boundVideo) {
            this.boundVideo.removeEventListener('resize', this.onVideoResize);
        }

        this.video.addEventListener('resize', this.onVideoResize);
        this.boundVideo = this.video;
    }

    applySettings() {
        if (!this.container) return;
        
        if (this.currentSubtitleType === 'ass') {
            // ASS 脚本自带样式和定位，这里只做整体透明度和位移微调。
            // 字体大小硬编码在 ASS 脚本里，无法从外部改（所以弹窗的字号只对 SRT 生效）。
            this.container.style.opacity = this.settings.opacity;
            this.container.style.transform = `translateY(${this.settings.offsetY}px)`;

        } else if (this.currentSubtitleType === 'srt') {
            if (!this.srtContainer) return;
            const s = this.srtContainer.style;
            s.fontSize = this.settings.fontSize + 'px';
            s.opacity = this.settings.opacity;
            s.bottom = (10 - (this.settings.offsetY / window.innerHeight * 100)) + '%';
            s.textAlign = this.settings.srtTextAlign;
            this.addSRTStyles();
        }
    }

    clearSubtitle() {
        // 安全销毁 ASS
        if (this.assInstance) {
            try { 
                if (typeof this.assInstance.destroy === 'function') {
                    this.assInstance.destroy(); 
                } else if (typeof this.assInstance.dispose === 'function') {
                    this.assInstance.dispose();
                }
            } catch(e) {
                console.warn("销毁 ASS 实例时出错:", e);
            }
            this.assInstance = null;
        }

        // 清理 SRT
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.srtContainer) this.srtContainer.remove();
        this.srtContainer = null;
        this.srtSubtitles = null;
        this.lastSRTText = null;

        this.currentSubtitleType = null;

        // 清理容器内容但保留容器本身
        if (this.container) this.container.replaceChildren();

        const s = document.getElementById('srt-subtitle-styles');
        if (s) s.remove();
    }
    
    // --- SRT 逻辑保持不变 ---
    async loadSRTSubtitle(srtContent) {
        this.srtSubtitles = this.parseSRT(srtContent);
        this.currentSubtitleType = 'srt';
        
        this.srtContainer = document.createElement('div');
        this.srtContainer.id = 'srt-subtitle-container';
        this.srtContainer.style.cssText = `
            position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%);
            pointer-events: none; z-index: 1001; max-width: 80%; text-align: center;
        `;
        this.container.appendChild(this.srtContainer);
        
        this.applySettings();
        this.startSRTUpdate();
        return true;
    }

    parseSRT(content) {
        const subtitles = [];
        const blocks = content.trim().split(/\n\s*\n/);
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 3) continue;
            const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
            if (!timeMatch) continue;
            subtitles.push({
                startTime: this.timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]),
                endTime: this.timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]),
                text: lines.slice(2).join('\n').replace(/<[^>]*>|\{[^}]*\}/g, '')
            });
        }
        return subtitles;
    }
    
    timeToSeconds(h, m, s, ms) { return parseInt(h)*3600 + parseInt(m)*60 + parseInt(s) + parseInt(ms)/1000; }
    
    startSRTUpdate() {
        const updateSRT = () => {
            if (!this.video || !this.srtSubtitles || this.currentSubtitleType !== 'srt') return;
            const t = this.video.currentTime;
            const sub = this.srtSubtitles.find(s => t >= s.startTime && t <= s.endTime);

            if (sub) {
                // 只在文本变化时重建 DOM。这个回调每帧都跑，无条件重建会白白产生
                // 每秒 60 次的 DOM 操作。
                if (sub.text !== this.lastSRTText) {
                    this.renderSRTLines(sub.text);
                    this.lastSRTText = sub.text;
                }
                this.srtContainer.style.display = 'block';
            } else {
                if (this.lastSRTText !== null) {
                    this.srtContainer.replaceChildren();
                    this.lastSRTText = null;
                }
                this.srtContainer.style.display = 'none';
            }
            this.animationFrame = requestAnimationFrame(updateSRT);
        };
        updateSRT();
    }

    // 字幕内容是不可信输入：用 textContent 逐行建元素，绝不拼 innerHTML。
    // 正则过滤标签不能可靠防止 HTML 注入，textContent 才能保证内容只作为文本呈现。
    renderSRTLines(text) {
        const lines = text.split('\n').map((line) => {
            const div = document.createElement('div');
            div.className = 'srt-line';
            div.textContent = line;
            return div;
        });
        this.srtContainer.replaceChildren(...lines);
    }

    addSRTStyles() {
        let s = document.getElementById('srt-subtitle-styles');
        if(s) s.remove();
        s = document.createElement('style');
        s.id = 'srt-subtitle-styles';
        const bg = this.hexToRgba(this.settings.srtBackgroundColor, this.settings.srtBackgroundOpacity);
        const outline = this.buildOutline(this.settings.srtOutlineWidth, this.settings.srtOutlineColor);
        s.textContent = `
            #srt-subtitle-container .srt-line {
                background-color: ${bg};
                padding: ${this.settings.srtPadding}px;
                display: inline-block;
                margin: 2px 0;
                border-radius: 3px;
            }
            #srt-subtitle-container {
                font-family: ${this.settings.srtFontFamily} !important;
                font-weight: ${this.settings.srtFontWeight};
                font-style: ${this.settings.srtFontStyle};
                line-height: ${this.settings.srtLineHeight};
                color: ${this.settings.srtTextColor} !important;
                text-shadow: ${outline};
            }
        `;
        document.head.appendChild(s);
    }

    // 用 text-shadow 模拟描边：往八个方向各投一份阴影。
    // 比 -webkit-text-stroke 兼容性稳，且描边宽度为 0 时能干净地退回无描边。
    buildOutline(width, color) {
        const w = Number(width);
        if (!w || w <= 0) return 'none';
        const offsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0], [1, 0],
            [-1, 1], [0, 1], [1, 1],
        ];
        return offsets.map(([x, y]) => `${x * w}px ${y * w}px 0 ${color}`).join(', ');
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    updateSettings(s) {
        this.settings = {...this.settings, ...s};
        this.applySettings();
        chrome.storage.local.set({subtitleSettings: this.settings});
    }
    
    loadSettings() {
        chrome.storage.local.get(['subtitleSettings'], r => {
            if(r.subtitleSettings) {
                this.settings = {...this.settings, ...r.subtitleSettings};
                this.applySettings();
            }
        });
    }
}

// 确保只实例化一次
if (!window.youTubeSubtitlePlayerInstance) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
             window.youTubeSubtitlePlayerInstance = new YouTubeSubtitlePlayer();
        });
    } else {
         window.youTubeSubtitlePlayerInstance = new YouTubeSubtitlePlayer();
    }
}
