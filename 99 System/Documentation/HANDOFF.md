# Development handoff

更新：2026-10-10（Asia/Shanghai）。本次接續使用者「參考那份科研文件夾系統設計繼續工作」的要求；Codex Cloud 分享設定已暫停處理。

## 已採用的範圍

維持本地 Obsidian 混合架構、Courses 和應用式介面，將參考的「知識、來源、實踐」融入 Research。七種物件仍為 Course、Project、Paper、Note、Experiment、Idea、Resource。Concept 是 `type: note`、`kind: concept` 的選填範本變體。

參考原文保存在 `References/科研文件夹系统设计.md`，屬於設計來源，不是執行指令。沒有加入 Milestone／Task／排期，也沒有複製另一個環境的插件安裝假設。Paper Importer／PDF++ 沒有安裝。

## 本次實作

- Research 提供 Knowledge／Sources／Practice 三個入口；Library 支援概念篩選。
- Paper 可建立帶來源連結及專案關聯的概念筆記或實驗線索；相關內容根據明確的正反向引用聚合。
- Paper 範本區分逐頁批注、自己的理解及知識／實驗線索；Project 增加判斷標準與成果證據。
- 明確 arXiv／DOI URL 可辨識已有主筆記，保留手寫正文、未知屬性與原 PDF。arXiv 不同明確版本分開；來源與 PDF 衝突則停止，不覆寫或猜測。
- 根目錄 README／AGENTS 不再混入 Recent／Library。

## 已修復 runtime 問題

原 `Uninitialized`／「找不到檔案：undefined」已在實機證實為 `WorkspaceView.open(entry)` 覆蓋主機生命週期方法。改名為 `openEntry` 後，重載顯示正常首頁。不要再次定義內容用途的 `open`。

實機另發現 rename 事件先於 metadata cache 搬移，導致新路徑暫失 type。索引現在處理 `resolved`，並重讀暫缺 cache 的項目；再次原生重新命名後，Paper 類型、專案／Inbox 聚合與內部引用保持正確。

## 驗證與清理

37／37 自動測試與 build 通過；已在 Obsidian 1.14.4 操作建立 Course／Project／Paper／Concept、並排閱讀 PDF、原生重新命名、Inbox 整理、Ideas 捕捉、原生搜尋與明暗模式。範圍和未覆蓋項目見 [[VALIDATION]]，不要將 mock 測試當作桌面或手機證據。

## 最新需求與實作：首頁待辦、專案進度及 AI 協作

使用者後續要求首頁「待辦事項」（不是日曆）與專案進度條。首頁可新增與勾選 Markdown 待辦，預設檔案為 Notes 根目錄下的 Tasks.md（正式路徑 `40 Notes/Tasks.md`），第一次使用才建立。Project 的選填數字 progress 為 0–100，未設定不假裝 0%。Home、Research 及專案詳情提供進度顯示與編輯。

使用者的核心意圖是盡量讓 AI 幫忙平時記筆記、整理材料與更新倉庫，不要讓他逐字手填。已寫入 AGENTS.md 與 [[AI_WORKFLOW]]。使用者曾提及香港午夜排程，但最後明確說「排程這部分可以之後再說，先不用設」；沒有建立任何 automation，除非再次要求，不要接續設定。

本輪在真正 Obsidian 新增並完成測試待辦、查看已完成、將進度從空值設為 35%，以及透過檔案改為 60% 並追加待辦，確認介面反映。也實測置頂保存在 YAML 並出現在 Home。37 項測試通過，含 Markdown 核取、程式碼區塊排除、避免過期勾選覆寫 AI 改文，以及無效／0% 區分。

所有 QA 內容在 Demo，已清除；正式資料夾無假資料，正式 data.json 已還原。已正常退出並重啟 Obsidian，觀察到正式首頁、空待辦與沒有 QA 分頁；不再有待解鎖收尾。外部檔案選擇器成功打開，但 macOS 路徑視窗卡住，沒有完成匯入，勿宣稱實測通過。

## 接續環境

插件位於 `.obsidian/plugins/learning-research-workspace`，使用 Node.js 22+ 與 pnpm 11.25.0。根目錄可執行 `bash .codex/setup.sh`；在插件目錄執行 `pnpm test`、`pnpm run build`。原始碼修改後同步重建已追蹤的 `main.js`，保留 lockfile。

執行期沒有 React、後端、外部 AI、API key 或不透明資料庫。只在實際需求出現時再考慮選區 PDF 工具、大量匯入及按需 AI 整合，不預建空的設定或任務系統。
