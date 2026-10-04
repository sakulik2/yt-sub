// ESLint 配置：只 lint 手写源码。
// ass-loader.js 是 vendored 生成产物，不检查。
// 目标是抓 node --check 抓不到的真问题：未定义变量、笔误的 chrome API 名、
// 声明后未使用的变量，而不是风格问题（本仓库没有 formatter，风格靠与邻近代码保持一致）。

const globals = require('globals');

const rules = {
    'no-undef': 'error',
    'no-unused-vars': ['warn', { args: 'none' }],
    'no-redeclare': 'error',
    'no-dupe-keys': 'error',
    'no-dupe-args': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': 'warn',
    'no-empty': ['warn', { allowEmptyCatch: true }],
};

module.exports = [
    {
        // 扩展本身：浏览器 + chrome API
        files: ['content.js', 'popup.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.webextensions,
                ASS: 'readonly', // 由 ass-loader.js 定义为全局变量
            },
        },
        rules: { ...rules, 'no-implicit-globals': 'error' },
    },
    {
        // 开发工具脚本：Node CommonJS
        files: ['scripts/**/*.js', 'eslint.config.js', '.claude/hooks/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: globals.node,
        },
        rules,
    },
];
