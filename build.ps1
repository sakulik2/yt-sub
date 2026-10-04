<#
.SYNOPSIS
构建可直接「加载已解压的扩展程序」的 yt-sub-build\ 目录。

.DESCRIPTION
与 build.sh 行为一致，改一个要同步改另一个。
加 -Zip 额外打包成 yt-sub-<version>.zip，文件位于 zip 根目录，这是 Chrome Web Store 要求的结构。

本文件含中文，必须保存为带 BOM 的 UTF-8：Windows PowerShell 5.1 会把无 BOM 的脚本按系统 ANSI 编码读取。

.PARAMETER Zip
额外生成 yt-sub-<version>.zip。

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Zip
#>
[CmdletBinding()]
param(
    [switch]$Zip
)

$ErrorActionPreference = 'Stop'

# 所有路径都相对脚本所在目录，不依赖调用时的工作目录
$root = $PSScriptRoot
$buildDir = Join-Path $root 'yt-sub-build'

# 随扩展发布的文件。manifest.json 引用的 .js/.html 必须都在这里，下面会检查。
# popup.html 里 <script> 引用的文件需要手动加进来。
$files = @(
    'manifest.json'
    'popup.html'
    'popup.js'
    'content.js'
    'ass-loader.js'
    'ass-loader.LICENSE'
)

foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $file) -PathType Leaf)) {
        throw "源文件不存在: $file"
    }
}

$manifestText = Get-Content -LiteralPath (Join-Path $root 'manifest.json') -Raw -Encoding UTF8

# manifest 里出现的 .js/.html 字符串就是它引用的文件（content_scripts、default_popup）
foreach ($match in [regex]::Matches($manifestText, '"([^"]+\.(?:js|html))"')) {
    $ref = $match.Groups[1].Value
    # -cnotcontains 区分大小写，与 build.sh 一致
    if ($files -cnotcontains $ref) {
        throw "manifest.json 引用了 $ref，但它不在 `$files 列表里"
    }
}

$version = ($manifestText | ConvertFrom-Json).version
if (-not $version) {
    throw '读不到 manifest.json 的 version'
}

if (Test-Path -LiteralPath $buildDir) {
    Remove-Item -LiteralPath $buildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $buildDir | Out-Null
foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path $root $file) -Destination $buildDir
}
Write-Host "已复制 $($files.Count) 个文件到 yt-sub-build\ (v$version)"

if ($Zip) {
    $zipName = "yt-sub-$version.zip"
    $zipPath = Join-Path $root $zipName
    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }
    Compress-Archive -LiteralPath ($files | ForEach-Object { Join-Path $buildDir $_ }) -DestinationPath $zipPath
    Write-Host "已打包: $zipName"
}

Write-Host ''
Write-Host '在 chrome://extensions 开启开发者模式，用「加载已解压的扩展程序」选择 yt-sub-build 目录。'
