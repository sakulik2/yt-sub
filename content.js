// YouTube ASS/SRT字幕播放器 Content Script
class YouTubeSubtitlePlayer {
    constructor() {
        this.assInstance = null;
        this.srtSubtitles = null;
        this.srtContainer = null;
        this.video = null;
        this.container = null;
        this.currentSubtitleType = null; // 'ass' or 'srt'
        this.animationFrame = null;
        this.settings = {
            fontSize: 20,
            opacity: 1,
            offsetY: 0,
            // SRT专用设置
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
        
        // 首先加载ASS.js库
        this.loadASSLibrary().then(() => {
            this.init();
        }).catch((error) => {
            console.error('ASS.js库加载失败:', error);
            // 即使ASS.js加载失败，我们仍然可以处理SRT文件
            this.init();
        });
    }
    
        async loadASSLibrary() {
    if (typeof window.ASS !== 'undefined') {
        return Promise.resolve();
    }

    try {
        // 指向我们新建的封装文件
        const src = chrome.runtime.getURL('ass-loader.js');
        
        // 动态导入
        const module = await import(src);
        
        // 获取默认导出
        if (module.default) {
            window.ASS = module.default;
            console.log('ASS loaded successfully');
            return Promise.resolve();
        } else {
            throw new Error('No default export found in ass-loader.js');
        }
    } catch (error) {
        console.error('ASS Load Error:', error);
        return Promise.reject(error);
    }
}
    init() {
        // 等待YouTube视频元素加载
        this.waitForVideo();
        
        // 监听来自popup的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // 保持消息通道开启
        });
        
        // 加载保存的设置
        this.loadSettings();
    }
    
    waitForVideo() {
        const checkVideo = () => {
            this.video = document.querySelector('video.html5-main-video');
            const playerContainer = document.querySelector('#movie_player');
            
            if (this.video && playerContainer) {
                this.setupContainer(playerContainer);
                console.log('YouTube Subtitle Player: 视频元素已找到');
            } else {
                setTimeout(checkVideo, 1000);
            }
        };
        
        checkVideo();
        
        // 监听URL变化（SPA路由）
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
        // 创建字幕容器
        if (this.container) {
            this.container.remove();
        }
        
        this.container = document.createElement('div');
        this.container.id = 'subtitle-container';
        this.container.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 1000;
            font-family: -apple-system, BlinkMacSystemFont, 'Microsoft YaHei', 'SimHei', sans-serif;
        `;
        
        playerContainer.appendChild(this.container);
    }
    
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'loadSubtitle':
                    const success = await this.loadSubtitle(request.content, request.fileName, request.type);
                    sendResponse({ success });
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
                    sendResponse({ 
                        success: true, 
                        type: this.currentSubtitleType,
                        hasSubtitle: this.currentSubtitleType !== null
                    });
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Subtitle Player Error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async loadSubtitle(content, fileName, type) {
        if (!this.video || !this.container) {
            throw new Error('视频播放器未准备就绪');
        }
        
        try {
            // 清除现有字幕
            this.clearSubtitle();
            
            if (type === 'srt') {
                return this.loadSRTSubtitle(content);
            } else if (type === 'ass') {
                return this.loadASSSubtitle(content);
            } else {
                throw new Error('不支持的字幕格式。请使用.ass或.srt文件');
            }
            
        } catch (error) {
            console.error('字幕加载详细错误:', error);
            console.error('Error stack:', error.stack);
            
            // 提供更详细的错误信息
            let errorMessage = error.message;
            if (error.message.includes('parse')) {
                errorMessage = '字幕文件解析失败，请检查文件格式是否正确';
            } else if (error.message.includes('font')) {
                errorMessage = '字体加载失败，但字幕功能不受影响';
            } else if (error.message.includes('ASS.js')) {
                errorMessage = 'ASS.js库加载失败，请检查网络连接并刷新页面';
            }
            
            throw new Error(errorMessage);
        }
    }
    
    async loadSRTSubtitle(srtContent) {
        console.log('Loading SRT content, length:', srtContent.length);
        
        // 解析SRT内容
        this.srtSubtitles = this.parseSRT(srtContent);
        this.currentSubtitleType = 'srt';
        
        // 创建SRT字幕容器
        this.srtContainer = document.createElement('div');
        this.srtContainer.id = 'srt-subtitle-container';
        this.srtContainer.style.cssText = `
            position: absolute;
            bottom: 10%;
            left: 50%;
            transform: translateX(-50%);
            pointer-events: none;
            z-index: 1001;
            max-width: 80%;
            text-align: center;
        `;
        
        this.container.appendChild(this.srtContainer);
        
        // 应用当前设置
        this.applySettings();
        
        // 开始SRT字幕更新循环
        this.startSRTUpdate();
        
        console.log('SRT字幕加载成功，共', this.srtSubtitles.length, '条字幕');
        return true;
    }
    
    parseSRT(content) {
        const subtitles = [];
        const blocks = content.trim().split(/\n\s*\n/);
        
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            if (lines.length < 3) continue;
            
            const index = parseInt(lines[0]);
            const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
            
            if (!timeMatch) continue;
            
            const startTime = this.timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
            const endTime = this.timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
            const text = lines.slice(2).join('\n');
            
            subtitles.push({
                index,
                startTime,
                endTime,
                text: this.cleanSRTText(text)
            });
        }
        
        return subtitles;
    }
    
    timeToSeconds(hours, minutes, seconds, milliseconds) {
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
    }
    
    cleanSRTText(text) {
        // 清理SRT文本中的HTML标签和特殊格式
        return text
            .replace(/<[^>]*>/g, '') // 移除HTML标签
            .replace(/\{[^}]*\}/g, '') // 移除ASS样式标签
            .replace(/\\N/g, '\n') // 替换换行符
            .trim();
    }
    
    startSRTUpdate() {
        const updateSRT = () => {
            if (!this.video || !this.srtSubtitles || this.currentSubtitleType !== 'srt') {
                return;
            }
            
            const currentTime = this.video.currentTime;
            let currentSubtitle = null;
            
            // 查找当前时间对应的字幕
            for (const subtitle of this.srtSubtitles) {
                if (currentTime >= subtitle.startTime && currentTime <= subtitle.endTime) {
                    currentSubtitle = subtitle;
                    break;
                }
            }
            
            // 更新字幕显示
            if (currentSubtitle) {
                this.srtContainer.innerHTML = this.formatSRTText(currentSubtitle.text);
                this.srtContainer.style.display = 'block';
            } else {
                this.srtContainer.style.display = 'none';
            }
            
            // 继续更新循环
            this.animationFrame = requestAnimationFrame(updateSRT);
        };
        
        updateSRT();
    }
    
    formatSRTText(text) {
        // 将文本转换为HTML格式，支持多行
        return text.split('\n').map(line => 
            `<div class="srt-line">${this.escapeHtml(line)}</div>`
        ).join('');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async loadASSSubtitle(assContent) {
        // 确保ASS.js可用
        if (typeof window.ASS === 'undefined') {
            console.log('ASS未找到，尝试重新加载...');
            await this.loadASSLibrary();
        }
        
        // 再次检查ASS.js是否可用
        if (typeof window.ASS === 'undefined') {
            throw new Error('ASS.js库加载失败，请检查网络连接或刷新页面重试');
        }
        
        console.log('Loading ASS content, length:', assContent.length);
        console.log('ASS content preview:', assContent.substring(0, 200));
        
        // 验证ASS内容
        this.validateASSContent(assContent);
        
        // 创建ASS实例，使用更宽松的配置
        const assConfig = {
            container: this.container,
            resampling: 'video_height',
            // 启用本地字体
            availableFonts: await this.getAvailableFonts(),
            fallbackFont: 'Microsoft YaHei, SimHei, Arial, sans-serif'
        };
        
        console.log('Creating ASS instance with config:', assConfig);
        this.assInstance = new window.ASS(assContent, this.video, assConfig);
        this.currentSubtitleType = 'ass';
        
        // 应用当前设置
        this.applySettings();
        
        // 监听视频事件以确保字幕同步
        this.setupVideoEventListeners();
        
        console.log('ASS字幕加载成功');
        return true;
    }
    
    validateASSContent(content) {
        console.log('Validating ASS content...');
        
        if (!content || content.trim().length === 0) {
            throw new Error('ASS文件内容为空');
        }
        
        // 检查必要的段落
        const requiredSections = ['[Script Info]', '[V4+ Styles]', '[Events]'];
        const missingSections = requiredSections.filter(section => !content.includes(section));
        
        if (missingSections.length > 0) {
            console.warn('Missing ASS sections:', missingSections);
            // 不抛出错误，让ASS.js尝试解析
        }
        
        // 检查是否有对话行
        const dialogueLines = content.split('\n').filter(line => 
            line.trim().startsWith('Dialogue:')
        );
        
        console.log('Found dialogue lines:', dialogueLines.length);
        
        if (dialogueLines.length === 0) {
            throw new Error('ASS文件中没有找到字幕对话内容');
        }
        
        // 验证对话行格式
        const invalidLines = dialogueLines.filter(line => {
            const parts = line.split(',');
            return parts.length < 10; // 标准ASS对话行至少应该有10个字段
        });
        
        if (invalidLines.length > 0) {
            console.warn('Found potentially invalid dialogue lines:', invalidLines.length);
            console.warn('Sample invalid line:', invalidLines[0]);
        }
        
        console.log('ASS content validation completed');
    }
    
    setupVideoEventListeners() {
        if (!this.video || !this.assInstance) return;
        
        // 确保字幕与视频同步
        const syncSubtitles = () => {
            if (this.assInstance && this.assInstance.resize) {
                try {
                    this.assInstance.resize();
                } catch (error) {
                    console.warn('Subtitle sync error:', error);
                }
            }
        };
        
        // 监听视频尺寸变化
        this.video.addEventListener('loadedmetadata', syncSubtitles);
        this.video.addEventListener('resize', syncSubtitles);
        
        // 监听全屏变化
        document.addEventListener('fullscreenchange', () => {
            setTimeout(syncSubtitles, 100);
        });
    }
    
    clearSubtitle() {
        // 清除ASS字幕
        if (this.assInstance) {
            this.assInstance.destroy();
            this.assInstance = null;
        }
        
        // 清除SRT字幕
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        if (this.srtContainer) {
            this.srtContainer.remove();
            this.srtContainer = null;
        }
        
        this.srtSubtitles = null;
        this.currentSubtitleType = null;
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // 移除SRT样式
        const srtStyles = document.getElementById('srt-subtitle-styles');
        if (srtStyles) {
            srtStyles.remove();
        }
        
        console.log('所有字幕已清除');
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.applySettings();
        
        // 保存设置
        chrome.storage.local.set({ subtitleSettings: this.settings });
    }
    
    applySettings() {
        if (!this.container) return;
        
        if (this.currentSubtitleType === 'ass') {
            this.applyASSSettings();
        } else if (this.currentSubtitleType === 'srt') {
            this.applySRTSettings();
        }
    }
    
    applyASSSettings() {
        if (!this.container) return;
        
        // 应用通用设置
        this.container.style.fontSize = this.settings.fontSize + 'px';
        this.container.style.opacity = this.settings.opacity;
        this.container.style.transform = `translateY(${this.settings.offsetY}px)`;
        
        // 如果有ASS实例，触发重渲染
        if (this.assInstance && this.assInstance.resize) {
            this.assInstance.resize();
        }
    }
    
    applySRTSettings() {
        if (!this.srtContainer) return;
        
        const styles = {
            fontSize: this.settings.fontSize + 'px',
            opacity: this.settings.opacity,
            fontFamily: this.settings.srtFontFamily,
            fontWeight: this.settings.srtFontWeight,
            fontStyle: this.settings.srtFontStyle,
            textAlign: this.settings.srtTextAlign,
            color: this.settings.srtTextColor,
            lineHeight: this.settings.srtLineHeight,
            padding: this.settings.srtPadding + 'px'
        };
        
        // 应用垂直偏移
        const baseBottom = 10;
        const adjustedBottom = baseBottom - (this.settings.offsetY / window.innerHeight * 100);
        this.srtContainer.style.bottom = adjustedBottom + '%';
        
        // 应用文本样式
        Object.assign(this.srtContainer.style, styles);
        
        // 设置文本阴影和背景
        if (this.settings.srtOutlineWidth > 0) {
            const outlineColor = this.settings.srtOutlineColor;
            const outlineWidth = this.settings.srtOutlineWidth;
            this.srtContainer.style.textShadow = `
                ${outlineWidth}px ${outlineWidth}px 0 ${outlineColor},
                -${outlineWidth}px -${outlineWidth}px 0 ${outlineColor},
                ${outlineWidth}px -${outlineWidth}px 0 ${outlineColor},
                -${outlineWidth}px ${outlineWidth}px 0 ${outlineColor},
                ${outlineWidth}px 0 0 ${outlineColor},
                -${outlineWidth}px 0 0 ${outlineColor},
                0 ${outlineWidth}px 0 ${outlineColor},
                0 -${outlineWidth}px 0 ${outlineColor}
            `;
        }
        
        // 添加SRT专用样式
        this.addSRTStyles();
    }
    
    addSRTStyles() {
        // 检查是否已经添加了样式
        let srtStyles = document.getElementById('srt-subtitle-styles');
        if (srtStyles) {
            srtStyles.remove();
        }
        
        srtStyles = document.createElement('style');
        srtStyles.id = 'srt-subtitle-styles';
        
        const bgColor = this.hexToRgba(this.settings.srtBackgroundColor, this.settings.srtBackgroundOpacity);
        
        srtStyles.textContent = `
            #srt-subtitle-container .srt-line {
                background-color: ${bgColor};
                border-radius: 3px;
                margin: 2px 0;
                padding: ${this.settings.srtPadding}px;
                display: inline-block;
                max-width: 100%;
                box-decoration-break: clone;
                -webkit-box-decoration-break: clone;
            }
            
            #srt-subtitle-container .srt-line:empty {
                display: none;
            }
            
            #srt-subtitle-container {
                font-family: ${this.settings.srtFontFamily} !important;
                font-weight: ${this.settings.srtFontWeight} !important;
                font-style: ${this.settings.srtFontStyle} !important;
                text-align: ${this.settings.srtTextAlign} !important;
                line-height: ${this.settings.srtLineHeight} !important;
            }
        `;
        
        document.head.appendChild(srtStyles);
    }
    
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    loadSettings() {
        chrome.storage.local.get(['subtitleSettings'], (result) => {
            if (result.subtitleSettings) {
                this.settings = { ...this.settings, ...result.subtitleSettings };
                this.applySettings();
            }
        });
    }
    
    async getAvailableFonts() {
        // 尝试获取系统字体列表
        if (chrome.fontSettings && chrome.fontSettings.getFontList) {
            try {
                const fonts = await chrome.fontSettings.getFontList();
                return fonts.map(font => font.fontId);
            } catch (error) {
                console.warn('无法获取系统字体列表:', error);
            }
        }
        
        // 返回常见中文字体作为后备
        return [
            'Microsoft YaHei',
            'SimHei',
            'SimSun',
            'KaiTi',
            'FangSong',
            'PingFang SC',
            'Hiragino Sans GB',
            'Source Han Sans CN',
            'Noto Sans CJK SC',
            'WenQuanYi Micro Hei',
            'Arial',
            'Helvetica',
            'sans-serif'
        ];
    }
}

// 等待页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new YouTubeSubtitlePlayer();
    });
} else {
    new YouTubeSubtitlePlayer();
}