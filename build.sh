#!/usr/bin/env bash
# 构建可直接「加载已解压的扩展程序」的 yt-sub-build/ 目录。
# 加 --zip 额外打包成 yt-sub-<version>.zip，文件位于 zip 根目录，这是 Chrome Web Store 要求的结构。
# Windows 下对应的是 build.ps1，两者行为保持一致，改一个要同步改另一个。
set -euo pipefail

usage() {
    echo "用法: $0 [--zip]" >&2
}

make_zip=false
for arg in "$@"; do
    case "$arg" in
        --zip) make_zip=true ;;
        -h|--help) usage; exit 0 ;;
        *) usage; exit 1 ;;
    esac
done

# 先检查依赖再动文件，避免复制到一半才失败
if $make_zip && ! command -v zip >/dev/null; then
    echo "错误：需要 zip 命令。Windows 上请用 build.ps1 -Zip" >&2
    exit 1
fi

# 所有路径都相对脚本所在目录，不依赖调用时的工作目录
cd "$(dirname "$0")"

BUILD_DIR="yt-sub-build"

# 随扩展发布的文件。manifest.json 引用的 .js/.html 必须都在这里，下面会检查。
# popup.html 里 <script> 引用的文件需要手动加进来。
FILES=(
    "manifest.json"
    "popup.html"
    "popup.js"
    "content.js"
    "ass-loader.js"
    "ass-loader.LICENSE"
)

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "错误：源文件不存在: $file" >&2
        exit 1
    fi
done

# manifest 里出现的 .js/.html 字符串就是它引用的文件（content_scripts、default_popup）
while IFS= read -r ref; do
    found=false
    for file in "${FILES[@]}"; do
        if [ "$file" = "$ref" ]; then found=true; fi
    done
    if ! $found; then
        echo "错误：manifest.json 引用了 $ref，但它不在 FILES 列表里" >&2
        exit 1
    fi
done < <(grep -oE '"[^"]+\.(js|html)"' manifest.json | tr -d '"')

version=$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' manifest.json)
if [ -z "$version" ]; then
    echo "错误：读不到 manifest.json 的 version" >&2
    exit 1
fi

rm -rf "$BUILD_DIR"
mkdir "$BUILD_DIR"
cp "${FILES[@]}" "$BUILD_DIR/"
echo "已复制 ${#FILES[@]} 个文件到 $BUILD_DIR/ (v$version)"

if $make_zip; then
    zip_path="yt-sub-$version.zip"
    rm -f "$zip_path"
    (cd "$BUILD_DIR" && zip -q -X "../$zip_path" "${FILES[@]}")
    echo "已打包: $zip_path"
fi

echo
echo "在 chrome://extensions 开启开发者模式，用「加载已解压的扩展程序」选择 $BUILD_DIR 目录。"
