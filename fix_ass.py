import urllib.request
import os

# 配置
URL = "https://cdn.jsdelivr.net/npm/assjs/dist/ass.min.js"
FILENAME = "assjs.min.js"

def fix_ass_library():
    print(f"正在下载 {URL} ...")
    try:
        # 1. 下载原始库代码
        with urllib.request.urlopen(URL) as response:
            content = response.read().decode('utf-8')
        
        # 验证是否下载成功 (防止下载到 404 页面)
        if len(content) < 1000:
            print("❌ 下载失败：文件太小，可能下载到了错误页面。")
            return

        print("✅ 下载成功，正在进行兼容性修复...")

        # 2. 关键修复：将末尾的 this 替换为 window
        # 原始库通常以 }(this)); 结尾，在 ES Module 中 this 为 undefined
        # 我们将其强制改为 window
        if "}(this))" in content:
            patched_content = content.replace("}(this))", "}(window))")
            print("🔧 已修复: replace '}(this))' -> '}(window))'")
        elif "}(this)" in content:
            patched_content = content.replace("}(this)", "}(window)")
            print("🔧 已修复: replace '}(this)' -> '}(window)'")
        else:
            # 如果找不到标准结尾，强制追加补丁
            print("⚠️ 未找到标准结尾，尝试追加补丁...")
            patched_content = content + ";window.ASS = window.ASS || ASS;"

        # 3. 保存文件
        with open(FILENAME, 'w', encoding='utf-8') as f:
            f.write(patched_content)
            
        print(f"🎉 成功！已保存为 {FILENAME}")
        print(f"文件大小: {len(patched_content)} 字节")
        print("现在请重新加载 Chrome 插件。")

    except Exception as e:
        print(f"❌ 发生错误: {e}")

if __name__ == "__main__":
    fix_ass_library()
