import urllib.request
import re

# 我们下载非压缩版 (ass.js)，这样更容易精准修改，防止误删代码
URL = "https://cdn.jsdelivr.net/npm/assjs/dist/ass.js"
OUTPUT_FILE = "ass-loader.js"

def fix_ass_loader():
    print(f"⬇️  正在下载非压缩版: {URL} ...")
    try:
        with urllib.request.urlopen(URL) as response:
            content = response.read().decode('utf-8')
        
        print(f"📦 下载完成，原始大小: {len(content)} 字符")

        # --- 手术开始 ---
        
        # 1. 查找并替换 export default
        # 正则含义：匹配行首或行尾的 'export default ASS;'
        pattern = r'export\s+default\s+ASS;'
        
        if re.search(pattern, content):
            print("🔧 检测到 'export default ASS;' -> 正在替换为 window挂载...")
            # 替换为将 ASS 挂载到 window，并确保它是一个赋值语句
            new_content = re.sub(pattern, 'window.ASS = ASS; console.log("✅ ASS已挂载(Patch 1)");', content)
        else:
            print("⚠️ 未找到标准的 export default 语句，尝试通用清除...")
            # 如果没找到标准语句，暴力移除所有 export 关键字
            new_content = content.replace('export default', 'window.ASS =')
        
        # 2. 为了绝对安全，包裹在一个立即执行函数(IIFE)中
        final_code = f"""
// --------------------------------------------------
// Pached ASS-Loader (No Module Syntax)
// --------------------------------------------------
(function() {{
    const define = undefined; // 禁用 AMD 加载器探测
    const module = undefined; // 禁用 CommonJS 探测
    
    // --- 原始库代码开始 ---
    {new_content}
    // --- 原始库代码结束 ---

    // 二次确认：如果上面替换失败，这里手动补救
    if (typeof ASS !== 'undefined') {{
        window.ASS = ASS;
    }} else if (typeof window.ASS === 'undefined') {{
        // 如果库内部没有定义全局变量，尝试查找可能泄漏的变量
        console.error("❌ 严重：ASS 变量未定义，库结构可能不兼容");
    }}
    
    console.log("🚀 ASS-Loader 执行完毕，window.ASS 状态:", !!window.ASS);
}})();
"""
        
        # 3. 再次检查是否还有遗留的 export
        if "export " in final_code:
            print("⚠️ 警告：输出文件中仍然包含 'export' 关键字，尝试暴力移除...")
            final_code = final_code.replace("export ", "// export_removed ")

        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(final_code)
            
        print(f"✅ 已生成: {OUTPUT_FILE}")
        print("👉 请刷新 Chrome 扩展，然后刷新 YouTube 页面。")

    except Exception as e:
        print(f"❌ 失败: {e}")

if __name__ == "__main__":
    fix_ass_loader()
