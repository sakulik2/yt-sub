#!/bin/bash

# YouTube ASS Player 构建脚本
# 用于自动下载依赖并准备扩展文件

echo "🚀 开始构建 YouTube ASS Player 扩展..."

# 检查必要命令
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ 错误: $1 命令未找到，请先安装"
        exit 1
    fi
}

# 检查curl命令
check_command "curl"

# 创建临时目录
BUILD_DIR="youtube-ass-player-build"
echo "📁 创建构建目录: $BUILD_DIR"

if [ -d "$BUILD_DIR" ]; then
    echo "🗑️  清理旧的构建目录..."
    rm -rf "$BUILD_DIR"
fi

mkdir "$BUILD_DIR"
cd "$BUILD_DIR"

# 下载ASS.js库
echo "📥 下载 ASS.js 库..."
ASSJS_URL="https://cdn.jsdelivr.net/npm/assjs@latest/dist/ass.min.js"

if curl -L -o assjs.min.js "$ASSJS_URL"; then
    echo "✅ ASS.js 下载成功"
else
    echo "❌ ASS.js 下载失败，尝试备用链接..."
    # 备用链接
    ASSJS_BACKUP="https://unpkg.com/assjs@latest/dist/ass.min.js"
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

# 复制扩展文件到构建目录
echo "📋 复制扩展文件..."

# 需要复制的文件列表
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

# 复制README（可选）
if [ -f "README.md" ]; then
    cp "README.md" "$BUILD_DIR/"
    echo "✅ 复制: README.md"
fi

# 创建打包脚本
echo "📦 创建打包脚本..."
cat > "$BUILD_DIR/package.sh" << 'EOF'
#!/bin/bash
# 打包扩展为zip文件
ZIP_NAME="youtube-ass-player-$(date +%Y%m%d-%H%M%S).zip"
echo "📦 打包扩展: $ZIP_NAME"

zip -r "$ZIP_NAME" . -x "*.sh" "*.md" "package.sh"

if [ $? -eq 0 ]; then
    echo "✅ 打包成功: $ZIP_NAME"
    echo "📁 文件位置: $(pwd)/$ZIP_NAME"
else
    echo "❌ 打包失败"
    exit 1
fi
EOF

chmod +x "$BUILD_DIR/package.sh"

echo ""
echo "🎉 构建完成！"
echo ""
echo "📂 扩展文件已准备在: $BUILD_DIR/"
echo "📋 文件列表:"
ls -la "$BUILD_DIR/"

echo ""
echo "🔧 后续步骤:"
echo "1. 进入构建目录: cd $BUILD_DIR"
echo "2. (可选)打包扩展: ./package.sh"
echo "3. 在Chrome中加载: chrome://extensions/"
echo "4. 开启开发者模式并选择'加载已解压的扩展程序'"
echo "5. 选择 $BUILD_DIR 文件夹"

echo ""
echo "✨ 享受使用 YouTube ASS Player!"