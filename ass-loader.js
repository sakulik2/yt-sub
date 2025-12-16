// ass-loader.js
import './assjs.min.js';

// 检查 ASS 是否已挂载到 window，如果没有，可能是库加载顺序问题或兼容性问题
if (typeof window.ASS === 'undefined') {
    console.error('ASS library loaded but window.ASS is undefined. Please check if assjs.min.js ends with (window) instead of (this).');
}

export default window.ASS;
