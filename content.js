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
        
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // 必须返回 true 以支持异步 sendResponse
            this.handleMessage(request, sender, sendResponse);
            return true; 
        });
        
        this.loadSettings();
    }
    
    waitForVideo() {
        const checkVideo = () => {
            this.video = document.querySelector('video.html5-main-video');
            const playerContainer = document.querySelector('#movie_player');
            
            if (this.video && playerContainer) {
                this.setupContainer(playerContainer);
                this.setupVideoEventListeners(); // 提前绑定事件
            } else {
                setTimeout(checkVideo, 1000);
            }
        };
        
        checkVideo();
        
        // 路由监听（处理 YouTube 页面内跳转）
        let currentUrl = location.href;
        const observer = new MutationObserver(() => {
            if (location.href !== currentUrl) {
                currentUrl = location.href;
                if (currentUrl.includes('/watch')) {
                    setTimeout(() => this.waitForVideo(), 1000);
                }
            }
        });
        observer.observe(document, { subtree: true, childList: true });
    }
    
    setupContainer(playerContainer) {
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

    // --- 安全的方法调用 ---
    safeResize() {
        if (this.assInstance && typeof this.assInstance.resize === 'function') {
            this.assInstance.resize();
        }
    }

    setupVideoEventListeners() {
        if (!this.video) return;

        // 使用 safeResize 替代直接调用
        const sync = () => this.safeResize();
        
        this.video.addEventListener('resize', sync);
        document.addEventListener('fullscreenchange', () => {
            // 全屏切换时给一点延迟，确保容器尺寸已更新
            setTimeout(sync, 100);
            setTimeout(sync, 500);
        });
    }

    applySettings() {
        if (!this.container) return;
        
        if (this.currentSubtitleType === 'ass') {
            // 应用 CSS 变换来实现位移和透明度
            this.container.style.opacity = this.settings.opacity;
            // 注意：ASS 库通常自己管理位置，我们这里只做微调
            // 如果 translateY 太大可能会被裁剪，所以主要靠 opacity
            this.container.style.transform = `translateY(${this.settings.offsetY}px)`;
            
            // 尝试调整字体大小 (如果库支持)
            // 大多数 ASS 库不支持动态改 fontSize，因为它是硬编码在脚本里的
            // 我们这里主要依靠 safeResize
            this.safeResize();

        } else if (this.currentSubtitleType === 'srt') {
            if(!this.srtContainer) return;
            const s = this.srtContainer.style;
            s.fontSize = this.settings.fontSize + 'px';
            s.opacity = this.settings.opacity;
            s.bottom = (10 - (this.settings.offsetY/window.innerHeight*100)) + '%';
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
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
        if (this.srtContainer) this.srtContainer.remove();
        this.srtContainer = null;
        this.srtSubtitles = null;
        
        this.currentSubtitleType = null;
        
        // 清理容器内容但保留容器本身
        if (this.container) this.container.innerHTML = '';
        
        const s = document.getElementById('srt-subtitle-styles');
        if(s) s.remove();
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
                this.srtContainer.innerHTML = sub.text.split('\n').map(l => `<div class="srt-line">${l}</div>`).join('');
                this.srtContainer.style.display = 'block';
            } else {
                this.srtContainer.style.display = 'none';
            }
            this.animationFrame = requestAnimationFrame(updateSRT);
        };
        updateSRT();
    }

    addSRTStyles() {
        let s = document.getElementById('srt-subtitle-styles');
        if(s) s.remove();
        s = document.createElement('style');
        s.id = 'srt-subtitle-styles';
        const bg = this.hexToRgba(this.settings.srtBackgroundColor, this.settings.srtBackgroundOpacity);
        s.textContent = `
            #srt-subtitle-container .srt-line { background-color: ${bg}; padding: ${this.settings.srtPadding}px; display: inline-block; margin: 2px 0; border-radius: 3px; }
            #srt-subtitle-container { 
                font-family: ${this.settings.srtFontFamily} !important;
                color: ${this.settings.srtTextColor} !important;
                text-shadow: 1px 1px 0 #000;
            }
        `;
        document.head.appendChild(s);
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
