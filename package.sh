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
