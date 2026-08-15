#!/bin/bash
set -euo pipefail

echo "🚀 开始构建 YT Sub 扩展..."

BUILD_DIR="yt-sub-build"

# 直接复制仓库里已有的 vendored ass-loader.js，不联网下载。
# 需要更新 ASS.js 库时单独跑 `python build.py` 并审查 diff。
FILES=(
    "manifest.json"
    "popup.html"
    "popup.js"
    "content.js"
    "ass-loader.js"
)

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 源文件不存在: $file"
        exit 1
    fi
done

if [ -d "$BUILD_DIR" ]; then
    echo "🗑️  清理旧的构建目录..."
    rm -rf "$BUILD_DIR"
fi

echo "📁 创建构建目录: $BUILD_DIR"
mkdir "$BUILD_DIR"

for file in "${FILES[@]}"; do
    cp "$file" "$BUILD_DIR/"
    echo "✅ 复制: $file"
done

echo ""
echo "✨ 构建完成。在 chrome://extensions 开启开发者模式，"
echo "   用「加载已解压的扩展程序」选择 $BUILD_DIR 目录。"
