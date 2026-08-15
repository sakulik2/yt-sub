// PostToolUse hook: 对刚被 Write/Edit 修改的 .js 文件跑 `node --check`。
// 本仓库没有 formatter 或 linter，语法检查是最快的自动反馈。
// 读取 stdin 上的 hook JSON payload，语法出错时以 decision:block 把错误回传给模型。

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
    let filePath;
    try {
        const payload = JSON.parse(raw);
        filePath = payload.tool_response?.filePath || payload.tool_input?.file_path;
    } catch {
        process.exit(0); // payload 异常时静默放过，不要挡住正常编辑
    }

    if (!filePath || path.extname(filePath) !== '.js') process.exit(0);

    // ass-loader.js 是 vendored 生成产物，不检查
    const base = path.basename(filePath);
    if (base === 'ass-loader.js') process.exit(0);

    // 文件不存在（已删除、或路径无法解析）时静默放过，避免把 MODULE_NOT_FOUND 当成语法错误
    if (!fs.existsSync(filePath)) process.exit(0);

    try {
        execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
    } catch (err) {
        const detail = (err.stderr?.toString() || err.message || '').trim();
        process.stdout.write(JSON.stringify({
            decision: 'block',
            reason: `${base} 语法检查失败（node --check）：\n${detail}`,
        }));
    }
    process.exit(0);
});
