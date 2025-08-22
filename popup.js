document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('assFile');
    const loadBtn = document.getElementById('loadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const status = document.getElementById('status');
    
    // 设置控件
    const fontSizeSlider = document.getElementById('fontSize');
    const opacitySlider = document.getElementById('opacity');
    const offsetYSlider = document.getElementById('offsetY');
    
    // 加载保存的设置
    loadSettings();
    
    loadBtn.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) {
            showStatus('请先选择一个.ass文件', 'error');
            return;
        }
        
        if (!file.name.toLowerCase().endsWith('.ass')) {
            showStatus('请选择.ass格式的字幕文件', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            let assContent = e.target.result;
            
            // 处理可能的编码问题
            try {
                // 尝试检测和修复常见的ASS文件问题
                assContent = processASSContent(assContent, file.name);
                
                // 发送字幕内容到content script
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'loadSubtitle',
                        content: assContent,
                        fileName: file.name
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            showStatus('无法连接到YouTube页面，请刷新页面后重试', 'error');
                        } else if (response && response.success) {
                            showStatus('字幕加载成功！', 'success');
                        } else {
                            showStatus(response?.error || '字幕加载失败，请检查文件格式', 'error');
                        }
                    });
                });
            } catch (error) {
                showStatus('文件格式处理失败: ' + error.message, 'error');
            }
        };
        
        reader.onerror = function() {
            showStatus('文件读取失败', 'error');
        };
        
        // 尝试多种编码方式读取
        try {
            reader.readAsText(file, 'UTF-8');
        } catch (error) {
            // 如果UTF-8失败，尝试其他编码
            try {
                reader.readAsText(file, 'GB2312');
            } catch (error2) {
                reader.readAsText(file);
            }
        }
    });
    
    clearBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'clearSubtitle'
            }, function(response) {
                if (response && response.success) {
                    showStatus('字幕已清除', 'success');
                    fileInput.value = '';
                }
            });
        });
    });
    
    // 设置变更监听
    [fontSizeSlider, opacitySlider, offsetYSlider].forEach(slider => {
        slider.addEventListener('input', function() {
            const settings = {
                fontSize: fontSizeSlider.value,
                opacity: opacitySlider.value,
                offsetY: offsetYSlider.value
            };
            
            // 保存设置
            chrome.storage.local.set({assSettings: settings});
            
            // 发送设置更新
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'updateSettings',
                    settings: settings
                });
            });
        });
    });
    
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
    
    function loadSettings() {
        chrome.storage.local.get(['assSettings'], function(result) {
            if (result.assSettings) {
                const settings = result.assSettings;
                fontSizeSlider.value = settings.fontSize || 20;
                opacitySlider.value = settings.opacity || 1;
                offsetYSlider.value = settings.offsetY || 0;
            }
        });
    }
    
    // 处理ASS文件内容，修复常见的格式问题
    function processASSContent(content, fileName) {
        console.log('Processing ASS file:', fileName);
        console.log('Original content length:', content.length);
        
        // 移除BOM标记
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }
        
        // 规范化行结束符
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 检查是否包含基本的ASS结构
        if (!content.includes('[Script Info]') && !content.includes('[V4+ Styles]')) {
            throw new Error('文件不是有效的ASS格式：缺少必要的段落标识');
        }
        
        // 如果缺少必要的段落，尝试添加
        let processedContent = content;
        
        // 确保有 [Script Info] 段落
        if (!processedContent.includes('[Script Info]')) {
            const scriptInfo = `[Script Info]
Title: ${fileName}
ScriptType: v4.00+

`;
            processedContent = scriptInfo + processedContent;
        }
        
        // 确保有 [V4+ Styles] 段落
        if (!processedContent.includes('[V4+ Styles]')) {
            const styles = `[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Microsoft YaHei,20,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1

`;
            // 在 [Events] 之前插入样式
            if (processedContent.includes('[Events]')) {
                processedContent = processedContent.replace('[Events]', styles + '[Events]');
            } else {
                processedContent += styles;
            }
        }
        
        // 确保有 [Events] 段落
        if (!processedContent.includes('[Events]')) {
            processedContent += `
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
        }
        
        // 修复可能的时间格式问题（Arctime有时会生成不标准的时间格式）
        processedContent = processedContent.replace(
            /Dialogue: (\d+),(\d{1,2}):(\d{2}):(\d{2})\.(\d{2}),(\d{1,2}):(\d{2}):(\d{2})\.(\d{2}),/g,
            function(match, layer, h1, m1, s1, ms1, h2, m2, s2, ms2) {
                // 确保时间格式为 H:MM:SS.CC
                const start = `${h1.padStart(1, '0')}:${m1.padStart(2, '0')}:${s1.padStart(2, '0')}.${ms1.padStart(2, '0')}`;
                const end = `${h2.padStart(1, '0')}:${m2.padStart(2, '0')}:${s2.padStart(2, '0')}.${ms2.padStart(2, '0')}`;
                return `Dialogue: ${layer},${start},${end},`;
            }
        );
        
        console.log('Processed content length:', processedContent.length);
        return processedContent;
    }
});