<template>
  <div class="search-panel">
    <!-- 搜索表单 -->
    <div class="search-form">
      <!-- 关键词输入 -->
      <div class="form-group">
        <label for="keywords">搜索关键词 (用逗号分隔)</label>
        <input
          v-model="searchForm.keywords"
          type="text"
          id="keywords"
          placeholder="例如: 报名活动，eventClick，提交表单"
          @keyup.enter="performSearch"
          :disabled="isSearching"
        />
        <div class="help-text">
          至少输入一个关键词，多个关键词用中文逗号（，）或英文逗号（,）分隔
        </div>
      </div>

      <!-- 包含文件模式 -->
      <div class="form-group">
        <label for="includePattern">包含文件 (可选)</label>
        <input
          v-model="searchForm.includePattern"
          type="text"
          id="includePattern"
          placeholder="例如: **/*.{js,ts,vue} 或 src/**"
          :disabled="isSearching"
        />
        <div class="help-text">
          使用 glob 模式，留空则搜索工作区中的所有文件
        </div>
      </div>

      <!-- 排除文件模式 -->
      <div class="form-group">
        <label for="excludePattern">排除文件 (可选)</label>
        <input
          v-model="searchForm.excludePattern"
          type="text"
          id="excludePattern"
          placeholder="例如: node_modules，dist，mock"
          :disabled="isSearching"
        />
        <div class="help-text">
          直接输入要排除的文件夹名，用逗号分隔（如 node_modules，dist），无需写
          **/xx/**
        </div>
      </div>

      <!-- 搜索选项 -->
      <div class="checkbox-group">
        <label>
          <input
            v-model="searchForm.caseSensitive"
            type="checkbox"
            :disabled="isSearching"
          />
          区分大小写
        </label>
      </div>

      <div class="checkbox-group">
        <label>
          <input
            v-model="searchForm.wholeWord"
            type="checkbox"
            :disabled="isSearching"
          />
          全词匹配
        </label>
      </div>

      <!-- 搜索按钮 -->
      <div class="search-buttons">
        <button
          @click="performSearch"
          :disabled="!canSearch || (isSearching && !canInterruptSearch)"
          class="search-btn"
        >
          {{ isSearching ? "🔄 搜索中..." : "🔍 搜索" }}
        </button>
        <button
          v-if="isSearching"
          @click="stopSearch"
          class="stop-btn"
          title="停止搜索"
        >
          ⏹️ 停止
        </button>
      </div>
    </div>

    <!-- 状态显示 -->
    <div v-if="status.message" :class="['status', status.type]">
      {{ status.message }}
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchResults.length > 0 || isSearching" class="results">
      <!-- 结果统计和视图切换 -->
      <div class="results-header">
        <div class="results-count">
          {{
            isSearching
              ? `正在搜索... 已找到 ${searchResults.length} 个匹配文件`
              : `找到 ${searchResults.length} 个匹配文件`
          }}
        </div>
        <div class="view-controls" v-if="searchResults.length > 0">
          <button
            @click="toggleAllExpanded"
            class="control-btn"
            :title="allExpanded ? '全部收起' : '全部展开'"
          >
            {{ allExpanded ? "📁 全部收起" : "📂 全部展开" }}
          </button>
          <button
            @click="toggleTreeView"
            class="control-btn"
            :title="isTreeView ? '切换到列表视图' : '切换到树形视图'"
          >
            {{ isTreeView ? "📄 列表视图" : "🌳 树形视图" }}
          </button>
        </div>
      </div>

      <!-- 树形视图 -->
      <div v-if="isTreeView && searchResults.length > 0" class="tree-view">
        <TreeNode
          v-for="(item, index) in groupedResults"
          :key="`${item.type}-${item.path || item.file?.filePath}-${index}`"
          :item="item"
          :level="0"
          :expandedDirectories="expandedDirectories"
          :expandedFiles="expandedFiles"
          @toggle-directory="toggleDirectory"
          @toggle-file="toggleFile"
          @open-file="openFile"
          @delete-file="deleteFile"
        />
      </div>

      <!-- 列表视图 -->
      <div v-else-if="searchResults.length > 0" class="list-view">
        <FileResultItem
          v-for="result in searchResults"
          :key="result.filePath"
          :result="result"
          :expanded="expandedFiles.has(result.filePath)"
          :isTreeView="false"
          @toggle="toggleFile(result.filePath)"
          @open-file="openFile"
          @delete-file="deleteFile"
        />
      </div>

      <!-- 搜索中的加载提示 -->
      <div
        v-if="isSearching && searchResults.length === 0"
        class="loading-hint"
      >
        <div class="loading-spinner">🔄</div>
        <p>正在搜索文件，请稍候...</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import FileResultItem from "./components/FileResultItem.vue";
import TreeNode from "./components/TreeNode.vue";

export default {
  name: "SearchPanel",
  components: {
    FileResultItem,
    TreeNode,
  },
  setup() {
    // 响应式数据
    const searchForm = ref({
      keywords: "",
      includePattern: "",
      excludePattern: "",
      caseSensitive: false,
      wholeWord: false,
    });

    const isSearching = ref(false);
    const canInterruptSearch = ref(true); // 是否可以中断搜索
    const status = ref({ message: "", type: "" });
    const searchResults = ref([]);

    // 展开/收起状态
    const expandedFiles = ref(new Set());
    const expandedDirectories = ref(new Set());
    const isTreeView = ref(false);

    // 计算属性
    const canSearch = computed(() => {
      const keywords = searchForm.value.keywords.trim();
      if (!keywords) return false;

      const keywordList = keywords
        .split(/[,，]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      return keywordList.length >= 1;
    });

    // 全部展开状态
    const allExpanded = computed(() => {
      return (
        searchResults.value.length > 0 &&
        searchResults.value.every((result) =>
          expandedFiles.value.has(result.filePath)
        )
      );
    });

    // 构建树形结构的结果
    const groupedResults = computed(() => {
      // 构建树形数据结构
      const buildTree = (results) => {
        const tree = {};

        results.forEach((result) => {
          // 统一使用正斜杠，处理Windows路径
          const normalizedPath = result.relativePath.replace(/\\/g, "/");
          const pathParts = normalizedPath.split("/");

          let currentLevel = tree;

          // 遍历路径的每一部分，构建树形结构
          for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            const isFile = i === pathParts.length - 1;

            if (isFile) {
              // 如果是文件，直接添加文件对象
              if (!currentLevel._files) {
                currentLevel._files = [];
              }
              currentLevel._files.push(result);
            } else {
              // 如果是目录，创建或进入子目录
              if (!currentLevel[part]) {
                currentLevel[part] = {
                  _path: pathParts.slice(0, i + 1).join("/"),
                  _name: part,
                  _level: i,
                };
              }
              currentLevel = currentLevel[part];
            }
          }
        });

        return tree;
      };

      // 将树形结构转换为扁平的渲染数组
      const flattenTree = (tree, level = 0, parentPath = "") => {
        const items = [];

        // 先添加目录
        Object.keys(tree).forEach((key) => {
          if (key.startsWith("_")) return; // 跳过元数据

          const node = tree[key];
          const currentPath = parentPath ? `${parentPath}/${key}` : key;

          // 添加目录节点
          items.push({
            type: "directory",
            name: key,
            path: currentPath,
            level: level,
            children: flattenTree(node, level + 1, currentPath),
            files: node._files || [],
          });
        });

        // 只有在根级别时才添加根目录的文件
        if (level === 0 && tree._files) {
          tree._files.forEach((file) => {
            items.push({
              type: "file",
              file: file,
              level: level,
            });
          });
        }

        return items;
      };

      const tree = buildTree(searchResults.value);
      return flattenTree(tree);
    });

    // VSCode API
    const vscode = window.acquireVsCodeApi?.() || {
      postMessage: (message) => {
        console.log("Mock VSCode API:", message);
      },
    };

    // 方法
    const performSearch = () => {
      if (!canSearch.value) return;

      // 如果正在搜索，先停止当前搜索
      if (isSearching.value) {
        stopSearch();
        // 等待一小段时间确保停止完成，然后开始新搜索
        setTimeout(() => {
          startNewSearch();
        }, 100);
        return;
      }

      startNewSearch();
    };

    const startNewSearch = () => {
      const keywords = searchForm.value.keywords.trim();
      const keywordList = keywords
        .split(/[,，]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (keywordList.length < 1) {
        setStatus("请输入至少一个关键词", "error");
        return;
      }

      // 重置展开状态
      expandedFiles.value.clear();
      expandedDirectories.value.clear();

      // 设置搜索状态
      isSearching.value = true;
      canInterruptSearch.value = true;
      setStatus("正在搜索，请稍候...", "info");
      searchResults.value = [];

      // 发送搜索请求
      vscode.postMessage({
        type: "search",
        data: {
          keywords: searchForm.value.keywords,
          includePattern: searchForm.value.includePattern,
          excludePattern: searchForm.value.excludePattern,
          caseSensitive: searchForm.value.caseSensitive,
          wholeWord: searchForm.value.wholeWord,
        },
      });
    };

    const stopSearch = () => {
      if (!isSearching.value) return;

      // 发送停止搜索请求
      vscode.postMessage({
        type: "stopSearch",
      });

      // 立即更新UI状态
      isSearching.value = false;
      canInterruptSearch.value = false;
      setStatus("搜索已停止", "info");
    };

    const openFile = (filePath, line, character) => {
      vscode.postMessage({
        type: "openFile",
        data: {
          filePath,
          line,
          character,
        },
      });
    };

    const deleteFile = (filePath) => {
      // 从搜索结果中移除指定文件
      searchResults.value = searchResults.value.filter(
        (result) => result.filePath !== filePath
      );

      // 同时从展开状态中移除
      expandedFiles.value.delete(filePath);

      // 更新状态消息
      if (searchResults.value.length === 0) {
        setStatus("所有文件已被移除", "info");
      } else {
        setStatus(
          `已移除文件，剩余 ${searchResults.value.length} 个匹配文件`,
          "success"
        );
      }
    };

    const setStatus = (message, type) => {
      status.value = { message, type };
    };

    // 切换文件展开状态
    const toggleFile = (filePath) => {
      if (expandedFiles.value.has(filePath)) {
        expandedFiles.value.delete(filePath);
      } else {
        expandedFiles.value.add(filePath);
      }
    };

    // 切换目录展开状态
    const toggleDirectory = (dirPath) => {
      if (expandedDirectories.value.has(dirPath)) {
        expandedDirectories.value.delete(dirPath);
      } else {
        expandedDirectories.value.add(dirPath);
      }
    };

    // 切换所有文件展开状态
    const toggleAllExpanded = () => {
      if (allExpanded.value) {
        // 全部收起
        expandedFiles.value.clear();
        if (isTreeView.value) {
          expandedDirectories.value.clear();
        }
      } else {
        // 全部展开
        searchResults.value.forEach((result) => {
          expandedFiles.value.add(result.filePath);
        });
        if (isTreeView.value) {
          const expandAllDirectories = (items) => {
            items.forEach((item) => {
              if (item.type === "directory") {
                expandedDirectories.value.add(item.path);
                if (item.children) {
                  expandAllDirectories(item.children);
                }
              }
            });
          };
          expandAllDirectories(groupedResults.value);
        }
      }
    };

    // 切换视图模式
    const toggleTreeView = () => {
      isTreeView.value = !isTreeView.value;

      // 如果切换到树形视图，默认展开所有目录
      if (isTreeView.value) {
        const expandAllDirectories = (items) => {
          items.forEach((item) => {
            if (item.type === "directory") {
              expandedDirectories.value.add(item.path);
              if (item.children) {
                expandAllDirectories(item.children);
              }
            }
          });
        };
        expandAllDirectories(groupedResults.value);
      }
    };

    const handleMessage = (event) => {
      const message = event.data;

      switch (message.type) {
        case "searchStart":
          isSearching.value = true;
          canInterruptSearch.value = true;
          setStatus(message.message, "info");
          searchResults.value = []; // 清空之前的结果
          break;

        case "searchProgress":
          // 显示搜索进度
          setStatus(message.message, "info");
          break;

        case "searchResultItem":
          // 流式添加单个搜索结果
          searchResults.value.push(message.data);

          // 自动展开前几个结果，让用户立即看到内容
          if (searchResults.value.length <= 3) {
            expandedFiles.value.add(message.data.filePath);
          }

          break;

        case "searchComplete":
          // 搜索完成
          isSearching.value = false;
          canInterruptSearch.value = false;
          if (searchResults.value.length === 0) {
            setStatus("未找到匹配的文件", "info");
          } else {
            setStatus(
              `搜索完成，共找到 ${searchResults.value.length} 个匹配文件`,
              "success"
            );
          }
          break;

        case "searchStopped":
          // 搜索被停止
          isSearching.value = false;
          canInterruptSearch.value = false;
          setStatus("搜索已停止", "info");
          break;

        case "searchResults":
          // 兼容旧的批量结果格式（如果后端仍然发送）
          isSearching.value = false;
          if (message.data.length === 0) {
            setStatus("未找到匹配的文件", "info");
          } else {
            setStatus(`找到 ${message.data.length} 个匹配文件`, "success");
            searchResults.value = message.data;

            // 默认展开前几个文件
            message.data.slice(0, 3).forEach((result) => {
              expandedFiles.value.add(result.filePath);
            });
          }
          break;

        case "error":
          isSearching.value = false;
          canInterruptSearch.value = false;
          setStatus(message.message, "error");
          break;
      }
    };

    // 生命周期
    onMounted(() => {
      window.addEventListener("message", handleMessage);
    });

    return {
      searchForm,
      isSearching,
      canInterruptSearch,
      status,
      searchResults,
      expandedFiles,
      expandedDirectories,
      isTreeView,
      canSearch,
      allExpanded,
      groupedResults,
      performSearch,
      stopSearch,
      openFile,
      deleteFile,
      toggleFile,
      toggleDirectory,
      toggleAllExpanded,
      toggleTreeView,
    };
  },
};
</script>
