# Change Log

All notable changes to the "multi-keyword-file-search" extension will be documented in this file.

## [1.0.0] - 2025-01-03

### Added
- Initial release of Multi Keyword File Search extension
- Multi-keyword search functionality - search for files containing all specified keywords
- Real-time streaming search results - see results appear as they are found
- Smart file filtering with simple folder exclusion (just enter folder names like `node_modules, dist`)
- Support for both include and exclude file patterns using glob syntax
- Case-sensitive and whole-word search options
- Tree view and list view modes for search results
- Click-to-navigate functionality - jump directly to file and line location
- Progress tracking and status updates during search
- Support for unlimited file sizes and result counts
- Webview-based search panel integrated into VS Code activity bar
- Unicode support for international text (Chinese, Japanese, etc.)
- Real-time result count and search progress display

### Features
- **Search Interface**: Clean, intuitive webview interface in the activity bar
- **Performance**: No file size limitations, processes all files in workspace
- **Flexibility**: User-controlled include/exclude patterns
- **User Experience**: Streaming results, real-time feedback, easy navigation
- **Accessibility**: Works with all text file types and international characters

### Technical Details
- Built with TypeScript and Vue.js
- Uses VS Code's native file search APIs
- Optimized batch processing for large workspaces
- Memory-efficient streaming architecture
