#!/bin/bash

echo "🚀 开始构建 YT Sub 扩展..."

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ 错误: $1 命令未找到，请先安装"
        exit 1
    fi
}

check_command "curl"

BUILD_DIR="yt-sub-build"
echo "📁 创建构建目录: $BUILD_DIR"

if [ -d "$BUILD_DIR" ]; then
    echo "🗑️  清理旧的构建目录..."
    rm -rf "$BUILD_DIR"
fi

mkdir "$BUILD_DIR"
cd "$BUILD_DIR"

# 下载正确的全局版本ASS.js库
echo "📥 下载 ASS.js 全局版本..."
ASSJS_URL="https://cdn.jsdelivr.net/npm/assjs@latest/dist/assjs.min.js"

if curl -L -o assjs.min.js "$ASSJS_URL"; then
    echo "✅ ASS.js 全局版本下载成功"
else
    echo "❌ ASS.js 下载失败，尝试备用链接..."
    ASSJS_BACKUP="https://unpkg.com/assjs@latest/dist/ass.global.min.js"
    if curl -L -o assjs.min.js "$ASSJS_BACKUP"; then
        echo "✅ ASS.js 从备用链接下载成功"
    else
        echo "❌ 无法下载 ASS.js 库"
        exit 1
    fi
fi

# 验证下载的文件
if [ -f "assjs.min.js" ] && [ -s "assjs.min.js" ]; then
    echo "✅ ASS.js 文件验证成功 (大小: $(du -h assjs.min.js | cut -f1))"
else
    echo "❌ ASS.js 文件验证失败"
    exit 1
fi

cd ..

# 复制其他文件...
FILES=(
    "manifest.json"
    "popup.html"
    "popup.js"
    "content.js"
    "content.css"
    "background.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BUILD_DIR/"
        echo "✅ 复制: $file"
    else
        echo "❌ 文件不存在: $file"
        exit 1
    fi
done

echo ""
echo "✨ 享受使用 YT Sub!"