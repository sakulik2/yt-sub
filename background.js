// YouTube ASS Player Background Script

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('YouTube ASS Player 扩展已安装');
        
        // 设置默认配置
        chrome.storage.local.set({
            assSettings: {
                fontSize: 20,
                opacity: 1,
                offsetY: 0
            }
        });
    }
});

// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
    // 检查是否在YouTube页面
    if (tab.url && tab.url.includes('youtube.com/watch')) {
        // 打开popup（这个在manifest v3中会自动处理）
        console.log('在YouTube页面上点击了扩展图标');
    } else {
        // 如果不在YouTube页面，提示用户
        chrome.tabs.create({
            url: 'https://www.youtube.com'
        });
    }
});

// 监听标签页更新，用于检测YouTube页面导航
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('youtube.com/watch')) {
        
        // YouTube视频页面加载完成，可以在这里做一些初始化工作
        console.log('YouTube视频页面已加载:', tab.url);
    }
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getFontList') {
        // 获取系统字体列表
        chrome.fontSettings.getFontList((fonts) => {
            sendResponse({ fonts: fonts });
        });
        return true; // 保持消息通道开启
    }
});

// 错误处理
chrome.runtime.onStartup.addListener(() => {
    console.log('YouTube ASS Player 后台脚本已启动');
});

chrome.runtime.onSuspend.addListener(() => {
    console.log('YouTube ASS Player 后台脚本即将暂停');
});