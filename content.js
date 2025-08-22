// YouTube ASS字幕播放器 Content Script
class YouTubeASSPlayer {
    constructor() {
        this.assInstance = null;
        this.video = null;
        this.container = null;
        this.settings = {
            fontSize: 20,
            opacity: 1,
            offsetY: 0
        };
        
        // 首先加载ASS.js库
        this.loadASSLibrary().then(() => {
            this.init();
        }).catch((error) => {
            console.error('ASS.js库加载失败:', error);
        });
    }
    
    async loadASSLibrary() {
        // 检查ASS是否已经可用
        if (typeof window.ASS !== 'undefined') {
            return Promise.resolve();
        }
        
        // 如果当前的assjs.min.js是ES6模块，我们需要动态导入
        try {
            // 方法1: 尝试动态导入本地文件
            const module = await import(chrome.runtime.getURL('assjs.min.js'));
            window.ASS = module.default;
            console.log('ASS.js模块加载成功 (本地ES6)');
            return;
        } catch (error) {
            console.log('本地ES6模块加载失败，尝试CDN:', error);
        }
        
        // 方法2: 从CDN加载全局版本
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/assjs@latest/dist/ass.global.js';
            script.onload = () => {
                if (typeof window.ASS !== 'undefined') {
                    console.log('ASS.js库加载成功 (CDN全局版本)');
                    resolve();
                } else {
                    reject(new Error('CDN版本ASS.js加载后仍未找到ASS对象'));
                }
            };
            script.onerror = () => {
                reject(new Error('无法从CDN加载ASS.js'));
            };
            document.head.appendChild(script);
        });
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
                console.log('YouTube ASS Player: 视频元素已找到');
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
        this.container.id = 'ass-subtitle-container';
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
                    const success = await this.loadSubtitle(request.content);
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
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('ASS Player Error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async loadSubtitle(assContent) {
        if (!this.video || !this.container) {
            throw new Error('视频播放器未准备就绪');
        }
        
        try {
            // 清除现有字幕
            this.clearSubtitle();
            
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
            
            // 应用当前设置
            this.applySettings();
            
            // 监听视频事件以确保字幕同步
            this.setupVideoEventListeners();
            
            console.log('ASS字幕加载成功');
            return true;
            
        } catch (error) {
            console.error('ASS字幕加载详细错误:', error);
            console.error('Error stack:', error.stack);
            
            // 提供更详细的错误信息
            let errorMessage = error.message;
            if (error.message.includes('parse')) {
                errorMessage = 'ASS文件解析失败，请检查文件格式是否正确';
            } else if (error.message.includes('font')) {
                errorMessage = '字体加载失败，但字幕功能不受影响';
            } else if (error.message.includes('ASS.js')) {
                errorMessage = 'ASS.js库加载失败，请检查网络连接并刷新页面';
            }
            
            throw new Error(errorMessage);
        }
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
        if (this.assInstance) {
            this.assInstance.destroy();
            this.assInstance = null;
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        console.log('ASS字幕已清除');
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.applySettings();
        
        // 保存设置
        chrome.storage.local.set({ assSettings: this.settings });
    }
    
    applySettings() {
        if (!this.container) return;
        
        // 应用字体大小和透明度
        this.container.style.fontSize = this.settings.fontSize + 'px';
        this.container.style.opacity = this.settings.opacity;
        
        // 应用垂直偏移
        this.container.style.transform = `translateY(${this.settings.offsetY}px)`;
        
        // 如果有ASS实例，触发重渲染
        if (this.assInstance && this.assInstance.resize) {
            this.assInstance.resize();
        }
    }
    
    loadSettings() {
        chrome.storage.local.get(['assSettings'], (result) => {
            if (result.assSettings) {
                this.settings = { ...this.settings, ...result.assSettings };
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
        new YouTubeASSPlayer();
    });
} else {
    new YouTubeASSPlayer();
}