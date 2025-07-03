import * as vscode from "vscode";
import * as path from "path";
import { SearchPanelProvider } from "./searchPanelProvider";

interface SearchResult {
  filePath: string;
  fileName: string;
  matchedKeywords: string[];
  keywordPositions: { [keyword: string]: vscode.Position[] };
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Multi Keyword File Search extension is now active!");

  // 注册搜索面板提供者
  const provider = new SearchPanelProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SearchPanelProvider.viewType,
      provider
    )
  );

  // 注册快速搜索命令（保留原有功能）
  const quickSearchDisposable = vscode.commands.registerCommand(
    "multiKeywordSearch.search",
    async () => {
      await performMultiKeywordSearch();
    }
  );

  // 注册打开搜索面板命令
  const openPanelDisposable = vscode.commands.registerCommand(
    "multiKeywordSearch.openSearchPanel",
    () => {
      vscode.commands.executeCommand(
        "workbench.view.extension.multiKeywordSearch"
      );
    }
  );

  context.subscriptions.push(quickSearchDisposable, openPanelDisposable);
}

async function performMultiKeywordSearch() {
  try {
    // 获取用户输入的关键词
    const keywordsInput = await vscode.window.showInputBox({
      prompt: "请输入要搜索的关键词（用逗号分隔）",
      placeHolder: "例如：报名活动, eventClick, 提交表单",
      validateInput: (value: string) => {
        if (!value || value.trim().length === 0) {
          return "请输入至少一个关键词";
        }
        const keywords = value
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
        if (keywords.length < 2) {
          return "请输入至少两个关键词";
        }
        return null;
      },
    });

    if (!keywordsInput) {
      return;
    }

    // 解析关键词
    const keywords = keywordsInput
      .split(",")
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0);

    vscode.window.showInformationMessage(
      `开始搜索包含以下关键词的文件：${keywords.join(", ")}`
    );

    // 显示进度条
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "搜索文件中...",
        cancellable: true,
      },
      async (progress, token) => {
        const results = await searchFilesWithKeywords(
          keywords,
          progress,
          token
        );

        if (token.isCancellationRequested) {
          return;
        }

        await displayResults(results, keywords);
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`搜索过程中发生错误: ${error}`);
  }
}

async function searchFilesWithKeywords(
  keywords: string[],
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
): Promise<SearchResult[]> {
  const config = vscode.workspace.getConfiguration("multiKeywordSearch");
  const fileExtensions = config.get<string[]>("fileExtensions", [
    "js",
    "ts",
    "vue",
    "html",
    "css",
  ]);
  const caseSensitive = config.get<boolean>("caseSensitive", false);
  const maxResults = config.get<number>("maxResults", 100);

  // 构建文件搜索模式
  const searchPattern = `**/*.{${fileExtensions.join(",")}}`;

  progress.report({ message: "正在查找文件...", increment: 10 });

  // 查找所有匹配的文件
  const files = await vscode.workspace.findFiles(
    searchPattern,
    "**/node_modules/**"
  );

  if (files.length === 0) {
    vscode.window.showInformationMessage("未找到任何可搜索的文件");
    return [];
  }

  progress.report({
    message: `正在搜索 ${files.length} 个文件...`,
    increment: 20,
  });

  const results: SearchResult[] = [];
  const increment = 70 / files.length; // 剩余70%的进度用于文件搜索

  for (let i = 0; i < files.length; i++) {
    if (token.isCancellationRequested) {
      break;
    }

    const file = files[i];

    try {
      const document = await vscode.workspace.openTextDocument(file);
      const searchKeywords = caseSensitive
        ? keywords
        : keywords.map((k: string) => k.toLowerCase());

      // 检查文件是否包含所有关键词
      const foundKeywords: string[] = [];
      const keywordPositions: { [keyword: string]: vscode.Position[] } = {};

      for (const keyword of searchKeywords) {
        const positions = findKeywordPositions(
          document,
          keyword,
          caseSensitive
        );
        if (positions.length > 0) {
          foundKeywords.push(keywords[searchKeywords.indexOf(keyword)]); // 保持原始大小写
          keywordPositions[keywords[searchKeywords.indexOf(keyword)]] =
            positions;
        }
      }

      // 如果包含所有关键词，添加到结果中
      if (foundKeywords.length === keywords.length) {
        results.push({
          filePath: file.fsPath,
          fileName: path.basename(file.fsPath),
          matchedKeywords: foundKeywords,
          keywordPositions: keywordPositions,
        });

        if (results.length >= maxResults) {
          break;
        }
      }
    } catch {
      // 忽略无法读取的文件
    }

    progress.report({ increment: increment });
  }

  return results;
}

function findKeywordPositions(
  document: vscode.TextDocument,
  keyword: string,
  caseSensitive: boolean
): vscode.Position[] {
  const positions: vscode.Position[] = [];
  const text = document.getText();
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();

  let startIndex = 0;
  while (true) {
    const index = searchText.indexOf(searchKeyword, startIndex);
    if (index === -1) {
      break;
    }

    const position = document.positionAt(index);
    positions.push(position);
    startIndex = index + keyword.length;
  }

  return positions;
}

async function displayResults(results: SearchResult[], keywords: string[]) {
  if (results.length === 0) {
    vscode.window.showInformationMessage(
      `未找到同时包含所有关键词的文件：${keywords.join(", ")}`
    );
    return;
  }

  // 创建快速选择项
  const quickPickItems: vscode.QuickPickItem[] = results.map((result) => {
    const keywordCount = Object.values(result.keywordPositions).reduce(
      (sum, positions) => sum + positions.length,
      0
    );
    return {
      label: `📄 ${result.fileName}`,
      description: `包含 ${keywordCount} 个关键词匹配`,
      detail: result.filePath,
      picked: false,
    };
  });

  // 添加统计信息到顶部
  quickPickItems.unshift({
    label: `✅ 找到 ${results.length} 个文件包含所有关键词：${keywords.join(
      ", "
    )}`,
    description: "",
    detail: "点击下方文件可打开并跳转到第一个关键词位置",
    picked: false,
  });

  const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "选择要打开的文件",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (
    selectedItem &&
    selectedItem.detail &&
    selectedItem.detail !== "点击下方文件可打开并跳转到第一个关键词位置"
  ) {
    const filePath = selectedItem.detail;
    const result = results.find((r) => r.filePath === filePath);

    if (result) {
      await openFileAndNavigateToKeyword(result, keywords[0]);
    }
  }
}

async function openFileAndNavigateToKeyword(
  result: SearchResult,
  firstKeyword: string
) {
  try {
    const document = await vscode.workspace.openTextDocument(result.filePath);
    const editor = await vscode.window.showTextDocument(document);

    // 跳转到第一个关键词的位置
    const positions = result.keywordPositions[firstKeyword];
    if (positions && positions.length > 0) {
      const firstPosition = positions[0];
      editor.selection = new vscode.Selection(firstPosition, firstPosition);
      editor.revealRange(
        new vscode.Range(firstPosition, firstPosition),
        vscode.TextEditorRevealType.InCenter
      );

      // 显示匹配信息
      const matchInfo = Object.entries(result.keywordPositions)
        .map(([keyword, positions]) => `${keyword}: ${positions.length}个匹配`)
        .join(", ");

      vscode.window.showInformationMessage(
        `已打开文件 ${result.fileName}，匹配情况：${matchInfo}`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(`打开文件失败: ${error}`);
  }
}

export function deactivate() {}
