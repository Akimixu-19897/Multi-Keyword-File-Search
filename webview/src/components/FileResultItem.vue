<template>
  <div class="result-item">
    <!-- 文件头部：可点击展开/收起 -->
    <div class="file-header" @click="$emit('toggle')">
      <div class="file-header-left">
        <span class="expand-icon">
          {{ isTreeView ? (expanded ? "🔽" : "▶️") : "" }}
        </span>

        <span class="file-name">
          {{ isTreeView ? result.fileName : result.relativePath }}
        </span>
      </div>
      <div class="file-header-right">
        <span class="match-count">{{ result.totalMatches }} 匹配</span>
        <button
          class="open-file-btn"
          @click.stop="$emit('open-file', result.filePath)"
          title="打开文件"
        >
          🔗
        </button>
        <button
          class="delete-btn"
          @click.stop="$emit('delete-file', result.filePath)"
          title="从结果中移除"
        >
          ×
        </button>
      </div>
    </div>

    <!-- 展开内容：匹配详情 -->
    <div v-if="expanded" class="file-details">
      <!-- 树形视图：简单展示匹配行 -->
      <div v-if="isTreeView" class="tree-matches">
        <div
          v-for="(positions, keyword) in result.keywordPositions"
          :key="keyword"
        >
          <div
            v-for="(pos, index) in positions"
            :key="`${keyword}-${index}`"
            class="tree-match-line"
            @click="
              $emit('open-file', result.filePath, pos.line, pos.character)
            "
          >
            <span class="match-text">{{ pos.text }}</span>
          </div>
        </div>
      </div>

      <!-- 列表视图：原有样式 -->
      <div v-else class="matches-container">
        <div
          v-for="(positions, keyword) in result.keywordPositions"
          :key="keyword"
          class="keyword-matches-group"
        >
          <div class="match-lines">
            <div
              v-for="(pos, index) in positions"
              :key="`${keyword}-${index}`"
              class="match-line"
              @click="
                $emit('open-file', result.filePath, pos.line, pos.character)
              "
            >
              <span class="match-text">{{ pos.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";

export default {
  name: "FileResultItem",
  props: {
    result: {
      type: Object,
      required: true,
    },
    expanded: {
      type: Boolean,
      default: false,
    },
    isTreeView: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["toggle", "open-file", "delete-file"],
  setup() {
    const showAllMatches = ref(false);

    return {
      showAllMatches,
    };
  },
};
</script>

<style scoped>
.result-item {
  margin-bottom: 8px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  background-color: var(--vscode-panel-background);
  overflow: hidden;
  transition: all 0.2s ease;
}

.result-item:hover {
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  background-color: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  transition: background-color 0.2s ease;
}

.file-header:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.file-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.expand-icon {
  font-size: 14px;
  transition: transform 0.2s ease;
}

.file-icon {
  font-size: 16px;
}

.file-name {
  font-weight: 500;
  color: var(--vscode-textLink-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}

.file-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.match-count {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  background-color: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
}

.open-file-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  font-size: 12px;
  transition: background-color 0.2s ease;
}

.open-file-btn:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 3px;
  font-size: 16px;
  font-weight: bold;
  color: var(--vscode-errorForeground);
  transition: background-color 0.2s ease;
}

.delete-btn:hover {
  background-color: var(--vscode-errorBackground);
}

.file-path {
  padding: 8px 15px;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  background-color: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  font-family: var(--vscode-font-family);
}

.file-details {
  padding: 8px;
  background-color: var(--vscode-panel-background);
}

.keyword-matches {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.label {
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
  font-weight: 500;
}

.keyword-tag {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.matches-container {
  margin-top: 8px;
}

.keyword-matches-group {
  margin-bottom: 5px;
}

.keyword-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.keyword-name {
  font-weight: 600;
  color: var(--vscode-textLink-foreground);
  font-size: 14px;
}

.keyword-count {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.match-lines {
  margin-left: 16px;
}

.match-line {
  margin: 2px 0;
  padding: 4px 8px;
  background-color: var(--vscode-editor-selectionBackground);
  border-radius: 3px;
  cursor: pointer;
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  transition: background-color 0.2s ease;
  display: flex;
  gap: 6px;
}

.match-line:hover {
  background-color: var(--vscode-editor-selectionHighlightBackground);
}

.line-number {
  color: var(--vscode-editorLineNumber-foreground);
  font-weight: 500;
  min-width: 40px;
  flex-shrink: 0;
}

.match-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.show-more {
  margin-top: 8px;
  text-align: center;
}

.show-more-btn {
  background: none;
  border: 1px solid var(--vscode-button-border);
  color: var(--vscode-textLink-foreground);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.show-more-btn:hover {
  background-color: var(--vscode-button-hoverBackground);
}

/* 树形视图的匹配行样式 */
.tree-matches {
  padding: 0;
}

.tree-match-line {
  margin: 1px 0;
  padding: 2px 8px;
  cursor: pointer;
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  transition: background-color 0.2s ease;
  display: flex;
  gap: 6px;
}

.tree-match-line:hover {
  background-color: var(--vscode-editor-selectionBackground);
}

.tree-match-line .line-number {
  color: var(--vscode-editorLineNumber-foreground);
  font-weight: 500;
  min-width: 40px;
  flex-shrink: 0;
}

.tree-match-line .match-text {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}
</style>
