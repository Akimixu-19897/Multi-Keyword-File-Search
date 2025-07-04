# Multi Keyword File Search | 多关键词文件搜索

一个强大的 VS Code 扩展，支持搜索同时包含多个关键词的文件，具有实时流式搜索结果显示功能。

## ✨ 功能特点

- 🔍 **多关键词搜索**: 搜索同时包含多个关键词的文件
- ⚡ **流式结果**: 搜索过程中实时显示结果
- 📍 **精确定位**: 点击搜索结果可直接跳转到关键词位置
- 🎯 **智能过滤**: 简单的文件夹名或使用 glob 模式包含/排除文件
- ⚙️ **灵活选项**: 区分大小写、全词匹配等选项
- 🌳 **多种视图**: 在树形结构和平铺列表视图之间切换
- 🚀 **高性能**: 快速搜索大型代码库，无文件大小或结果数量限制
- ⏹️ **可中断搜索**: 随时停止当前搜索并开始新搜索

## 🛠️ 使用方法

### 快速开始
1. 打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)
2. 运行 "Multi Keyword File Search" 命令或点击活动栏中的搜索图标
3. 输入关键词，用逗号分隔（例如：`function, export, component`）
4. 实时查看搜索结果！

### 高级选项
- **包含文件**: 使用 glob 模式如 `**/*.{js,ts,vue}` 或 `src/**`
- **排除文件夹**: 简单输入文件夹名如 `node_modules, dist, build`
- **区分大小写**: 切换大小写敏感匹配
- **全词匹配**: 仅匹配完整单词
- **停止搜索**: 在搜索过程中点击停止按钮中断当前搜索

## 📝 示例

### 基础搜索
```
关键词: function, export
```
查找同时包含 "function" 和 "export" 关键词的所有文件。

### 带过滤的搜索
```
关键词: component, props
包含: src/**/*.vue  
排除: node_modules, dist
```
仅在 src 文件夹中搜索 Vue 文件，排除 node_modules 和 dist。

### 中文关键词
```
关键词: 用户登录, 验证码, 提交表单
```
完美支持中文、日文或任何 Unicode 文本。

### 搜索控制
- 在搜索过程中，可以随时点击"停止"按钮中断搜索
- 修改关键词后按回车键会自动停止当前搜索并开始新搜索

## 📋 系统要求

- VS Code 1.74.0 或更高版本

## 🚀 安装

1. 打开 VS Code
2. 进入扩展视图 (`Ctrl+Shift+X`)
3. 搜索 "Multi Keyword File Search"
4. 点击安装

## 📊 配置

在 VS Code 设置中配置：

- `multiKeywordSearch.fileExtensions`: 要搜索的文件扩展名（默认：js, ts, vue, html, css 等）
- `multiKeywordSearch.caseSensitive`: 区分大小写搜索（默认：false）
- `multiKeywordSearch.maxResults`: 最大显示结果数（默认：100）

## 🔧 开发

### 安装依赖
```bash
npm install
```

### 编译
```bash
npm run compile
```

### 打包
```bash
npm install -g @vscode/vsce
vsce package
```

## 📝 更新日志

### 1.1.0
- 新增搜索中断功能
- 支持在搜索过程中停止并重新搜索
- 改进搜索体验和响应性

### 1.0.0
- 初始发布
- 多关键词搜索功能
- 流式搜索结果
- 智能文件过滤
- 树形和列表视图模式
- 实时进度更新
- 无文件大小或结果数量限制

## 🤝 贡献

欢迎提交 Issue 和功能请求！

**GitHub 仓库**: [https://github.com/Akimixu-19897/Multi-Keyword-File-Search](https://github.com/Akimixu-19897/Multi-Keyword-File-Search)

## 📄 许可证

MIT License

---

# English Documentation

A powerful VS Code extension that allows you to search for files containing multiple keywords anywhere in the file content with real-time streaming results.

## ✨ Features

- 🔍 **Multi-keyword search**: Search for files that contain all specified keywords
- ⚡ **Streaming results**: See results appear in real-time as the search progresses  
- 📍 **Precise navigation**: Click on search results to jump directly to the file and line
- 🎯 **Smart filtering**: Include or exclude files with simple folder names or glob patterns
- ⚙️ **Flexible options**: Case sensitivity, whole word matching, and more
- 🌳 **Multiple views**: Switch between tree structure and flat list views
- 🚀 **High performance**: Fast search across large codebases with no file size or result limits
- ⏹️ **Interruptible search**: Stop current search anytime and start a new one

## 🛠️ Usage

### Quick Start
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run "Multi Keyword File Search" command or click the search icon in activity bar
3. Enter keywords separated by commas (e.g., `function, export, component`)
4. See results appear in real-time!

### Advanced Options
- **Include Files**: Use glob patterns like `**/*.{js,ts,vue}` or `src/**`
- **Exclude Folders**: Simply enter folder names like `node_modules, dist, build` 
- **Case Sensitive**: Toggle case-sensitive matching
- **Whole Word**: Match whole words only
- **Stop Search**: Click the stop button during search to interrupt current search

## 📝 Examples

### Basic Search
```
Keywords: function, export
```
Finds all files containing both "function" and "export" keywords.

### With Filtering
```
Keywords: component, props
Include: src/**/*.vue  
Exclude: node_modules, dist
```
Searches only Vue files in src folder, excluding node_modules and dist.

### Chinese Keywords
```
Keywords: 用户登录, 验证码, 提交表单
```
Works perfectly with Chinese, Japanese, or any Unicode text.

### Search Control
- During search, click the "Stop" button anytime to interrupt current search
- Modifying keywords and pressing Enter will automatically stop current search and start a new one

## 📋 Requirements

- VS Code 1.74.0 or higher

## 🚀 Installation

1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X`)
3. Search for "Multi Keyword File Search"
4. Click Install

## 📊 Configuration

Configure in VS Code settings:

- `multiKeywordSearch.fileExtensions`: File extensions to search (default: js, ts, vue, html, css, etc.)
- `multiKeywordSearch.caseSensitive`: Case sensitive search (default: false)
- `multiKeywordSearch.maxResults`: Maximum results to show (default: 100)

## 🔧 Development

### Install Dependencies
```bash
npm install
```

### Compile
```bash
npm run compile
```

### Package
```bash
npm install -g @vscode/vsce
vsce package
```

## 📝 Release Notes

### 1.1.0
- Added search interruption functionality
- Support stopping search and starting new search during search process
- Improved search experience and responsiveness

### 1.0.0
- Initial release
- Multi-keyword search with streaming results
- Smart file filtering with simple folder exclusion
- Tree and list view modes
- Real-time progress updates
- No file size or result count limitations

## 🤝 Contributing

Issues and feature requests are welcome! 

**GitHub Repository**: [https://github.com/Akimixu-19897/Multi-Keyword-File-Search](https://github.com/Akimixu-19897/Multi-Keyword-File-Search)

## 📄 License

MIT License
