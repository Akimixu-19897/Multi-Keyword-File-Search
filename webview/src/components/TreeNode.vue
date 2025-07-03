<template>
  <div class="tree-node" :class="`level-${level}`">
    <!-- 目录节点 -->
    <div v-if="item.type === 'directory'" class="directory-node">
      <div
        class="directory-header"
        @click="toggleDirectory"
        :style="{ paddingLeft: `${level * 20 + 10}px` }"
      >
        <span class="directory-icon">
          {{ isExpanded ? "🔽" : "▶️" }}
        </span>
        <span class="directory-name">{{ item.name }}</span>
        <span class="file-count" v-if="totalFiles > 0">
          ({{ totalFiles }} 个文件)
        </span>
      </div>

      <!-- 展开的内容 -->
      <div v-if="isExpanded" class="directory-content">
        <!-- 递归渲染子目录和文件 -->
        <TreeNode
          v-for="(child, index) in item.children"
          :key="`${child.type}-${child.path || child.file?.filePath}-${index}`"
          :item="child"
          :level="level + 1"
          :expandedDirectories="expandedDirectories"
          :expandedFiles="expandedFiles"
          @toggle-directory="$emit('toggle-directory', $event)"
          @toggle-file="$emit('toggle-file', $event)"
          @open-file="$emit('open-file', $event)"
          @delete-file="$emit('delete-file', $event)"
        />

        <!-- 当前目录的直接文件 -->
        <FileResultItem
          v-for="file in item.files"
          :key="file.filePath"
          :result="file"
          :expanded="expandedFiles.has(file.filePath)"
          :isTreeView="true"
          @toggle="$emit('toggle-file', file.filePath)"
          @open-file="$emit('open-file', $event)"
          @delete-file="$emit('delete-file', $event)"
          :style="{ marginLeft: `${(level + 1) * 20}px` }"
          class="tree-file-item"
        />
      </div>
    </div>

    <!-- 文件节点（根目录的文件） -->
    <FileResultItem
      v-else-if="item.type === 'file'"
      :result="item.file"
      :expanded="expandedFiles.has(item.file.filePath)"
      :isTreeView="true"
      @toggle="$emit('toggle-file', item.file.filePath)"
      @open-file="$emit('open-file', $event)"
      @delete-file="$emit('delete-file', $event)"
      :style="{ marginLeft: `${level * 20}px` }"
      class="tree-file-item"
    />
  </div>
</template>

<script>
import { computed } from "vue";
import FileResultItem from "./FileResultItem.vue";

export default {
  name: "TreeNode",
  components: {
    FileResultItem,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
    expandedDirectories: {
      type: Set,
      required: true,
    },
    expandedFiles: {
      type: Set,
      required: true,
    },
  },
  emits: ["toggle-directory", "toggle-file", "open-file", "delete-file"],
  setup(props, { emit }) {
    const isExpanded = computed(() => {
      return (
        props.item.type === "directory" &&
        props.expandedDirectories.has(props.item.path)
      );
    });

    const totalFiles = computed(() => {
      if (props.item.type !== "directory") return 0;

      const countFiles = (node) => {
        let count = (node.files || []).length;
        if (node.children) {
          node.children.forEach((child) => {
            if (child.type === "directory") {
              count += countFiles(child);
            } else if (child.type === "file") {
              count += 1;
            }
          });
        }
        return count;
      };

      return countFiles(props.item);
    });

    const toggleDirectory = () => {
      if (props.item.type === "directory") {
        emit("toggle-directory", props.item.path);
      }
    };

    return {
      isExpanded,
      totalFiles,
      toggleDirectory,
    };
  },
};
</script>

<style scoped>
.tree-node {
  margin-bottom: 2px;
}

.directory-node {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  background-color: var(--vscode-panel-background);
  margin-bottom: 4px;
}

.directory-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  background-color: var(--vscode-editor-background);
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

.directory-header:hover {
  background-color: var(--vscode-list-hoverBackground);
}

.directory-icon {
  margin-right: 8px;
  font-size: 14px;
  transition: transform 0.2s ease;
}

.directory-name {
  flex: 1;
  font-weight: 500;
  color: var(--vscode-textLink-foreground);
  font-size: 13px;
}

.file-count {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-left: 10px;
}

.directory-content {
  padding: 4px 0;
}

.tree-file-item {
  margin: 2px 0;
  border-radius: 4px;
}

/* 不同层级的缩进样式 */
.level-0 .directory-header {
  font-weight: 700;
  background-color: var(--vscode-editor-background);
}

.level-1 .directory-header {
  background-color: rgba(var(--vscode-editor-background), 0.8);
}

.level-2 .directory-header {
  background-color: rgba(var(--vscode-editor-background), 0.6);
}
</style>
