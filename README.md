# personal_workspace

Local-first Personal Learning & Research Workspace，建於 Obsidian 之內。普通 Markdown、YAML 與附件是資料來源；單一自訂插件提供應用式導覽，編輯、PDF、搜尋與連結使用 Obsidian 原生功能。

已融入科研設計的「知識／來源／實踐」分工。載入與重新命名索引問題已修復；37 項測試通過，並已在 Obsidian 1.14.4 驗證主要建立、關聯、PDF 並排與明暗模式。驗證範圍及限制見 [VALIDATION](99%20System/Documentation/VALIDATION.md)。

- [接續開發／已知問題](99%20System/Documentation/HANDOFF.md)
- [工作區使用與資料模型](99%20System/Documentation/README.md)
- [架構決策](99%20System/Documentation/DESIGN_DECISIONS.md)
- [使用者提供的科研設計參考](99%20System/Documentation/References/科研文件夹系统设计.md)

## 開發

雲端環境的安裝命令可使用 `bash .codex/setup.sh`，會進入隱藏的插件目錄並以固定 pnpm 版本安裝鎖定依賴。根目錄的 `AGENTS.md` 提供接續開發與驗證指引。這些檔案只準備建置環境，不代表 Codex Cloud 環境已建立或發布。

插件完整原始碼與目前建置產物位於 `.obsidian/plugins/learning-research-workspace/`。使用 Node.js 22+ 與 pnpm：

```sh
cd .obsidian/plugins/learning-research-workspace
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

此倉庫根目錄也是 Obsidian Vault。以 Obsidian 開啟，啟用本地 Learning & Research Workspace 插件即可進行實機除錯。重新建置後須重新載入插件。無後端、雲端資料庫、AI API key 或額外 UI runtime。

`node_modules`、個人視窗布局、快取、測試 Demo 與環境密鑰檔不納入版本管理。各內容資料夾目前為空，未加入假課程或假論文。
