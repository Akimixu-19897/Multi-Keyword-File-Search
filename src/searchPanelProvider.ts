import * as vscode from "vscode";
import * as path from "path";

export class SearchPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "multiKeywordSearchPanel";
  private _view?: vscode.WebviewView;
  private _isSearching = false;
  private _shouldStopSearch = false;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // 监听来自 webview 的消息
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "search":
          await this.performSearch(message.data);
          break;
        case "stopSearch":
          this.stopSearch();
          break;
        case "openFile":
          await this.openFile(message.data);
          break;
      }
    });
  }

  private async performSearch(searchData: {
    keywords: string;
    includePattern: string;
    excludePattern: string;
    caseSensitive: boolean;
    wholeWord: boolean;
  }) {
    try {
      // 如果正在搜索，先停止当前搜索
      if (this._isSearching) {
        this._shouldStopSearch = true;
        await new Promise((resolve) => setTimeout(resolve, 100)); // 等待停止
      }

      if (!searchData.keywords.trim()) {
        this.sendMessage({ type: "error", message: "请输入搜索关键词" });
        return;
      }

      const keywords = searchData.keywords
        .split(/[,，]/)
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);

      if (keywords.length < 1) {
        this.sendMessage({
          type: "error",
          message: "请输入至少一个关键词",
        });
        return;
      }

      // 设置搜索状态
      this._isSearching = true;
      this._shouldStopSearch = false;

      // 发送搜索开始消息，清空之前的结果
      this.sendMessage({
        type: "searchStart",
        message: `正在搜索包含关键词: ${keywords.join(", ")} 的文件...`,
      });

      // 流式搜索，每找到一个结果就发送
      await this.searchFilesStreaming(keywords, searchData);

      // 如果没有被中断，发送搜索完成消息
      if (!this._shouldStopSearch) {
        this.sendMessage({ type: "searchComplete" });
      }

      this._isSearching = false;
    } catch (error) {
      this._isSearching = false;
      this._shouldStopSearch = false;
      this.sendMessage({ type: "error", message: `搜索失败: ${error}` });
    }
  }

  private stopSearch() {
    if (this._isSearching) {
      this._shouldStopSearch = true;
      this._isSearching = false;
      this.sendMessage({ type: "searchStopped" });
    }
  }

  private async searchFilesStreaming(keywords: string[], searchOptions: any) {
    // 获取工作区根目录
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      this.sendMessage({
        type: "error",
        message: "请先打开一个工作区文件夹",
      });
      return;
    }

    // 构建搜索模式 - 只有用户明确指定了才应用限制
    let includePattern = searchOptions.includePattern.trim();
    if (!includePattern) {
      includePattern = "**/*"; // 搜索所有文件
    }

    let excludePattern = searchOptions.excludePattern.trim();
    // 支持用逗号分隔多个文件夹名，自动转为 glob
    if (excludePattern) {
      // 分割并去除空白
      const excludeFolders = excludePattern
        .split(/[,，]/)
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);
      if (excludeFolders.length > 0) {
        // 转为 glob，如 node_modules → **/node_modules/**
        // VSCode 的 findFiles 支持使用 {pattern1,pattern2} 的语法
        excludePattern = `{${excludeFolders
          .map((name) => `**/${name}/**`)
          .join(",")}}`;
      } else {
        excludePattern = undefined;
      }
    } else {
      excludePattern = undefined;
    }

    this.sendMessage({
      type: "searchStart",
      message: "正在查找匹配的文件...",
    });

    // 添加调试信息
    if (excludePattern) {
      this.sendMessage({
        type: "searchProgress",
        message: `排除模式: ${excludePattern}`,
      });
    }

    const files = await vscode.workspace.findFiles(
      includePattern,
      excludePattern
    );

    if (files.length === 0) {
      this.sendMessage({
        type: "error",
        message: "未找到匹配的文件，请检查文件模式设置",
      });
      return;
    }

    // 获取文件大小信息，但不过滤任何文件
    const fileStats = await Promise.all(
      files.map(async (file) => {
        try {
          const stat = await vscode.workspace.fs.stat(file);
          return { file, size: stat.size };
        } catch {
          return { file, size: 0 };
        }
      })
    );

    // 按文件大小排序，优先处理小文件，但处理所有文件
    const sortedFiles = fileStats
      .sort((a, b) => a.size - b.size)
      .map(({ file }) => file);

    this.sendMessage({
      type: "searchStart",
      message: `开始搜索 ${sortedFiles.length} 个文件中的关键词...`,
    });

    let foundCount = 0;
    const batchSize = 10; // 适当增加批量大小以提高效率

    // 流式处理文件，每找到结果就立即发送，不限制结果数量
    for (let i = 0; i < sortedFiles.length; i += batchSize) {
      // 检查是否应该停止搜索
      if (this._shouldStopSearch) {
        this.sendMessage({
          type: "searchStopped",
          message: "搜索已被用户停止",
        });
        return;
      }

      const batch = sortedFiles.slice(i, i + batchSize);

      // 并发处理批次，但结果立即发送
      const batchPromises = batch.map(async (file) => {
        // 在处理每个文件前检查是否应该停止
        if (this._shouldStopSearch) {
          return null;
        }

        const result = await this.searchSingleFileOptimized(
          file,
          keywords,
          searchOptions
        );
        if (result && !this._shouldStopSearch) {
          foundCount++;
          // 立即发送找到的结果
          this.sendMessage({
            type: "searchResultItem",
            data: result,
            progress: {
              current: foundCount,
              processed: Math.min(i + batchSize, sortedFiles.length),
              totalFiles: sortedFiles.length,
            },
          });
        }
        return result;
      });

      await Promise.allSettled(batchPromises);

      // 检查是否应该停止搜索
      if (this._shouldStopSearch) {
        return;
      }

      // 发送进度更新
      this.sendMessage({
        type: "searchProgress",
        message: `已搜索 ${Math.min(i + batchSize, sortedFiles.length)} / ${
          sortedFiles.length
        } 个文件，找到 ${foundCount} 个匹配结果...`,
        progress: {
          processed: Math.min(i + batchSize, sortedFiles.length),
          total: sortedFiles.length,
          found: foundCount,
        },
      });
    }
  }

  private async searchSingleFileOptimized(
    file: vscode.Uri,
    keywords: string[],
    searchOptions: any
  ): Promise<any | null> {
    try {
      // 使用更高效的文件读取方式
      const fileContent = await vscode.workspace.fs.readFile(file);
      const text = Buffer.from(fileContent).toString("utf8");

      const searchText = searchOptions.caseSensitive
        ? text
        : text.toLowerCase();
      const searchKeywords = searchOptions.caseSensitive
        ? keywords
        : keywords.map((k: string) => k.toLowerCase());

      // 使用更高效的字符串搜索
      // 首先进行快速检查，如果任何关键词不存在就立即退出
      for (const keyword of searchKeywords) {
        if (!searchText.includes(keyword)) {
          return null;
        }
      }

      // 如果所有关键词都存在，再进行详细位置搜索
      const document = await vscode.workspace.openTextDocument(file);
      const foundKeywords: string[] = [];
      const keywordPositions: {
        [keyword: string]: {
          line: number;
          character: number;
          text: string;
        }[];
      } = {};

      for (const keyword of searchKeywords) {
        const positions = this.findKeywordPositionsOptimized(
          document,
          keyword,
          searchOptions
        );
        if (positions.length > 0) {
          const originalKeyword = keywords[searchKeywords.indexOf(keyword)];
          foundKeywords.push(originalKeyword);
          keywordPositions[originalKeyword] = positions;
        } else {
          return null;
        }
      }

      if (foundKeywords.length === keywords.length) {
        return {
          filePath: file.fsPath,
          fileName: path.basename(file.fsPath),
          relativePath: vscode.workspace.asRelativePath(file),
          matchedKeywords: foundKeywords,
          keywordPositions: keywordPositions,
          totalMatches: Object.values(keywordPositions).reduce(
            (sum, positions) => sum + positions.length,
            0
          ),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private findKeywordPositionsOptimized(
    document: vscode.TextDocument,
    keyword: string,
    options: any
  ) {
    const positions: { line: number; character: number; text: string }[] = [];
    const text = document.getText();
    const searchText = options.caseSensitive ? text : text.toLowerCase();
    const searchKeyword = options.caseSensitive
      ? keyword
      : keyword.toLowerCase();

    let startIndex = 0;
    const maxPositions = 50; // 增加最大位置数，允许找到更多匹配

    if (options.wholeWord) {
      // 优化正则表达式搜索
      const regex = new RegExp(
        `\\b${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        options.caseSensitive ? "g" : "gi"
      );

      let match;
      while (
        (match = regex.exec(searchText)) !== null &&
        positions.length < maxPositions
      ) {
        const position = document.positionAt(match.index);
        const line = document.lineAt(position.line);
        const lineText = line.text.trim();

        positions.push({
          line: position.line + 1,
          character: position.character,
          text:
            lineText.length > 100
              ? lineText.substring(0, 100) + "..."
              : lineText,
        });

        // 防止无限循环
        if (regex.lastIndex === match.index) {
          regex.lastIndex++;
        }
      }
    } else {
      // 优化简单字符串搜索
      while (positions.length < maxPositions) {
        const index = searchText.indexOf(searchKeyword, startIndex);
        if (index === -1) {
          break;
        }

        const position = document.positionAt(index);
        const line = document.lineAt(position.line);
        const lineText = line.text.trim();

        positions.push({
          line: position.line + 1,
          character: position.character,
          text:
            lineText.length > 100
              ? lineText.substring(0, 100) + "..."
              : lineText,
        });

        startIndex = index + searchKeyword.length;
      }
    }

    return positions;
  }

  private async openFile(data: {
    filePath: string;
    line?: number;
    character?: number;
  }) {
    try {
      const document = await vscode.workspace.openTextDocument(data.filePath);
      const editor = await vscode.window.showTextDocument(document);

      if (data.line !== undefined && data.character !== undefined) {
        const position = new vscode.Position(data.line - 1, data.character); // Convert to 0-based
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`无法打开文件: ${error}`);
    }
  }

  private sendMessage(message: any) {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const webviewDistPath = vscode.Uri.joinPath(
      this._extensionUri,
      "webview-dist"
    );

    // 获取构建后的文件URI
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDistPath, "search-panel.js")
    );
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDistPath, "search-panel.css")
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi Keyword Search Panel</title>
    <link rel="stylesheet" href="${cssUri}">
</head>
<body>
    <div id="app"></div>
    <script type="module" src="${jsUri}"></script>
</body>
</html>`;
  }
}
