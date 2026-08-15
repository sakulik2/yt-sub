// ESLint 配置：只 lint 手写的扩展源码。
// ass-loader.js / assjs.min.js 是 vendored 生成产物，不检查。
// 目标是抓 node --check 抓不到的真问题：未定义变量、笔误的 chrome API 名、
// 声明后未使用的变量，而不是风格问题（本仓库没有 formatter，风格靠与邻近代码保持一致）。

const globals = require('globals');

module.exports = [
    {
        files: ['background.js', 'content.js', 'popup.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.webextensions,
                ASS: 'readonly', // 由 ass-loader.js 挂到 window 上
            },
        },
        rules: {
            'no-undef': 'error',
            'no-unused-vars': ['warn', { args: 'none' }],
            'no-redeclare': 'error',
            'no-dupe-keys': 'error',
            'no-dupe-args': 'error',
            'no-unreachable': 'error',
            'no-constant-condition': 'warn',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-implicit-globals': 'error',
        },
    },
];
