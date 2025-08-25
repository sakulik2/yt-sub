document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('assFile');
    const loadBtn = document.getElementById('loadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const status = document.getElementById('status');
    const subtitleTypeIndicator = document.getElementById('subtitleType');
    
    // 通用设置控件
    const fontSizeSlider = document.getElementById('fontSize');
    const opacitySlider = document.getElementById('opacity');
    const offsetYSlider = document.getElementById('offsetY');
    
    // SRT专用设置控件
    const srtFontFamily = document.getElementById('srtFontFamily');
    const srtFontWeight = document.getElementById('srtFontWeight');
    const srtFontStyle = document.getElementById('srtFontStyle');
    const srtTextAlign = document.getElementById('srtTextAlign');
    const srtTextColor = document.getElementById('srtTextColor');
    const srtOutlineColor = document.getElementById('srtOutlineColor');
    const srtOutlineWidth = document.getElementById('srtOutlineWidth');
    const srtBackgroundColor = document.getElementById('srtBackgroundColor');
    const srtBackgroundOpacity = document.getElementById('srtBackgroundOpacity');
    const srtLineHeight = document.getElementById('srtLineHeight');
    const srtPadding = document.getElementById('srtPadding');
    
    // 设置分组
    const commonSettings = document.getElementById('commonSettings');
    const srtSettings = document.getElementById('srtSettings');
    
    // 当前字幕类型
    let currentSubtitleType = null;
    
    // 加载保存的设置
    loadSettings();
    
    // 更新颜色预览
    updateColorPreviews();
    
    loadBtn.addEventListener('click', function() {
        const file = fileInput.files[0];
        if (!file) {
            showStatus('请先选择一个字幕文件', 'error');
            return;
        }
        
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.ass') && !fileName.endsWith('.srt')) {
            showStatus('请选择.ass或.srt格式的字幕文件', 'error');
            return;
        }
        
        // 确定字幕类型
        const fileType = fileName.endsWith('.srt') ? 'srt' : 'ass';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            let content = e.target.result;
            
            try {
                // 处理可能的编码问题
                if (fileType === 'ass') {
                    content = processASSContent(content, file.name);
                } else {
                    content = processSRTContent(content, file.name);
                }
                
                // 发送字幕内容到content script
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'loadSubtitle',
                        content: content,
                        fileName: file.name,
                        type: fileType
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            showStatus('无法连接到YouTube页面，请刷新页面后重试', 'error');
                        } else if (response && response.success) {
                            showStatus(`${fileType.toUpperCase()}字幕加载成功！`, 'success');
                            updateUIForSubtitleType(fileType);
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
                    updateUIForSubtitleType(null);
                }
            });
        });
    });
    
    // 通用设置变更监听
    [fontSizeSlider, opacitySlider, offsetYSlider].forEach(slider => {
        slider.addEventListener('input', function() {
            updateSettings();
        });
    });
    
    // SRT专用设置变更监听
    [srtFontFamily, srtFontWeight, srtFontStyle, srtTextAlign, 
     srtTextColor, srtOutlineColor, srtOutlineWidth, 
     srtBackgroundColor, srtBackgroundOpacity, srtLineHeight, srtPadding].forEach(control => {
        control.addEventListener('change', function() {
            updateSettings();
            if (control.type === 'color') {
                updateColorPreviews();
            }
        });
        
        if (control.type === 'range') {
            control.addEventListener('input', function() {
                updateSettings();
            });
        }
    });
    
    function updateSettings() {
        const settings = {
            // 通用设置
            fontSize: parseInt(fontSizeSlider.value),
            opacity: parseFloat(opacitySlider.value),
            offsetY: parseInt(offsetYSlider.value),
            
            // SRT专用设置
            srtFontFamily: srtFontFamily.value,
            srtFontWeight: srtFontWeight.value,
            srtFontStyle: srtFontStyle.value,
            srtTextAlign: srtTextAlign.value,
            srtTextColor: srtTextColor.value,
            srtOutlineColor: srtOutlineColor.value,
            srtOutlineWidth: parseFloat(srtOutlineWidth.value),
            srtBackgroundColor: srtBackgroundColor.value,
            srtBackgroundOpacity: parseFloat(srtBackgroundOpacity.value),
            srtLineHeight: parseFloat(srtLineHeight.value),
            srtPadding: parseInt(srtPadding.value)
        };
        
        // 保存设置
        chrome.storage.local.set({subtitleSettings: settings});
        
        // 发送设置更新
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateSettings',
                settings: settings
            });
        });
    }
    
    function updateUIForSubtitleType(type) {
        currentSubtitleType = type;
        
        if (type) {
            subtitleTypeIndicator.textContent = type.toUpperCase();
            subtitleTypeIndicator.className = `subtitle-type-indicator ${type}`;
            subtitleTypeIndicator.classList.remove('hidden');
            
            if (type === 'srt') {
                srtSettings.classList.remove('hidden');
            } else {
                srtSettings.classList.add('hidden');
            }
        } else {
            subtitleTypeIndicator.classList.add('hidden');
            srtSettings.classList.add('hidden');
        }
    }
    
    function updateColorPreviews() {
        document.getElementById('textColorPreview').style.backgroundColor = srtTextColor.value;
        document.getElementById('outlineColorPreview').style.backgroundColor = srtOutlineColor.value;
        
        const bgColor = srtBackgroundColor.value;
        const bgOpacity = srtBackgroundOpacity.value;
        const rgba = hexToRgba(bgColor, bgOpacity);
        document.getElementById('backgroundColorPreview').style.backgroundColor = rgba;
    }
    
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
    
    function loadSettings() {
        chrome.storage.local.get(['subtitleSettings'], function(result) {
            if (result.subtitleSettings) {
                const settings = result.subtitleSettings;
                
                // 加载通用设置
                fontSizeSlider.value = settings.fontSize || 20;
                opacitySlider.value = settings.opacity || 1;
                offsetYSlider.value = settings.offsetY || 0;
                
                // 加载SRT专用设置
                srtFontFamily.value = settings.srtFontFamily || 'Microsoft YaHei, SimHei, Arial, sans-serif';
                srtFontWeight.value = settings.srtFontWeight || 'normal';
                srtFontStyle.value = settings.srtFontStyle || 'normal';
                srtTextAlign.value = settings.srtTextAlign || 'center';
                srtTextColor.value = settings.srtTextColor || '#ffffff';
                srtOutlineColor.value = settings.srtOutlineColor || '#000000';
                srtOutlineWidth.value = settings.srtOutlineWidth || 1;
                srtBackgroundColor.value = settings.srtBackgroundColor || '#000000';
                srtBackgroundOpacity.value = settings.srtBackgroundOpacity || 0.7;
                srtLineHeight.value = settings.srtLineHeight || 1.2;
                srtPadding.value = settings.srtPadding || 8;
                
                updateColorPreviews();
            }
        });
        
        // 检查当前是否有加载的字幕
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'getSubtitleStatus'
            }, function(response) {
                if (response && response.type) {
                    updateUIForSubtitleType(response.type);
                }
            });
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
        
        // 修复可能的时间格式问题
        processedContent = processedContent.replace(
            /Dialogue: (\d+),(\d{1,2}):(\d{2}):(\d{2})\.(\d{2}),(\d{1,2}):(\d{2}):(\d{2})\.(\d{2}),/g,
            function(match, layer, h1, m1, s1, ms1, h2, m2, s2, ms2) {
                const start = `${h1.padStart(1, '0')}:${m1.padStart(2, '0')}:${s1.padStart(2, '0')}.${ms1.padStart(2, '0')}`;
                const end = `${h2.padStart(1, '0')}:${m2.padStart(2, '0')}:${s2.padStart(2, '0')}.${ms2.padStart(2, '0')}`;
                return `Dialogue: ${layer},${start},${end},`;
            }
        );
        
        console.log('Processed content length:', processedContent.length);
        return processedContent;
    }
    
    // 处理SRT文件内容
    function processSRTContent(content, fileName) {
        console.log('Processing SRT file:', fileName);
        console.log('Original content length:', content.length);
        
        // 移除BOM标记
        if (content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
        }
        
        // 规范化行结束符
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 基本SRT格式验证
        const srtPattern = /\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/;
        if (!srtPattern.test(content)) {
            throw new Error('文件不是有效的SRT格式：缺少时间戳标识');
        }
        
        console.log('SRT content processed successfully');
        return content;
    }
});