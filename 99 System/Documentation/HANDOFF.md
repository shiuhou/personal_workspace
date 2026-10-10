# Development handoff

更新：2026-10-10（Asia/Shanghai）。這是使用者要求先推送至 GitHub、之後再繼續的開發存檔。

## 目前需求與範圍

建造在 Obsidian 內運作的 Personal Learning & Research Workspace，呈現專用應用介面，但核心知識仍為本地 Markdown、YAML、PDF、圖片等普通檔案。使用繁體中文主文案與英文分類／屬性。啟動時開啟 Home；原生檔案以新分頁開啟，論文可並排 PDF 與閱讀筆記。

目前採混合架構：一個輕量 TypeScript／原生 DOM 的 ItemView 插件，搭配 Obsidian 編輯器、PDF、MetadataCache、Vault、Properties 與 Search。七種物件為 Course、Project、Paper、Note、Experiment、Idea、Resource。主要導覽 Home、Courses、Research、Papers、Experiments、Ideas、Inbox；另有 Recent／Library。

保留既有約束：資料與呈現分離、低插件依賴、最少屬性、不複製跨專案資料、不產生假的個人內容、無背景活動監控、無日曆／完整任務管理／外部網站／雲端後端／自主 AI。原始碼與詳盡資料模型見 README 和 DESIGN_DECISIONS。

## 新參考尚未決定如何採用

使用者在驗證中途要求先閱讀 `References/科研文件夹系统设计.md`，接著要求把現有內容推送到 GitHub，待設定雲端開發環境後再繼續。

該檔是使用者提供的設計參考，原文完整保留，**不是已核准取代現行範圍的指令**。尚未回答的設計選擇是：整體改採這份三分區方案，還是只深化現有 Research 體驗並保留 Courses 與應用式 UI。

可吸收的原則：知識／論文來源／實踐證據分工，一篇論文一份主筆記與 PDF，保護手寫閱讀理解，概念按實際重用需求拆分。其 Milestone／Task／排期依賴方案與原 V1 排除任務管理的要求衝突，不能逕行新增。

參考檔提到的 Obsidian 1.12.7、Paper Importer 1.5.1、PDF++ 0.40.31、既有 RL 筆記與模板包屬於另一環境的記錄，不能當作本倉庫現況。本 Vault 實機版本是 **1.14.4**；只有本地自訂插件。沒有搬移另一個 Vault 的內容，也沒有匯入參考文件描述的 ZIP／知識筆記。

## 實作與驗證狀態

- 原始碼、樣式、七份模板、空資料夾、原生 Home／Library.base、配置與說明已建立。
- 2026-10-10 再次執行 `pnpm run build` 成功，`pnpm test` **25／25 通過**。
- 測試涵蓋 metadata 正規化、關聯、Inbox／Recent、檔名／路徑、5,000 筆純資料查詢，以及實際 FileActions 在模擬 Obsidian API 下的建立、撞名、保留正文、匯入、附件整理和失敗保留。
- 這些不是 Obsidian 端到端測試；5,000 筆測試也不是實際 Vault 啟動效能證明。
- 使用者已允許信任並啟用本次本地插件。最新實機畫面出現 Workspace ribbon 與 Learning & Research 分頁，但內容為 **Uninitialized**，並顯示 **「找不到檔案：undefined」**。首頁尚未正常顯示，不能宣稱插件載入及 UI 驗收通過。
- 無 Demo 資料留在 Vault。各正式內容資料夾目前只有 `.gitkeep`。

## 首要待辦

1. 修復實機 Workspace 載入。先確認 View 生命周期是否與自訂方法名稱碰撞：`src/views/workspace-view.ts` 的私有 `open(entry)` 是值得檢查的線索，**尚未證實為根因**。請觀察實際錯誤堆疊與 runtime 行為，再修復；不要僅以 TypeScript 通過作為完成證據。
2. 與使用者釐清新科研參考的適用範圍，再調整產品架構；避免自行擴增任務管理。
3. 完成真實 Obsidian 端到端驗證：Home／所有列表與詳情／空白狀態／搜尋／建立 Course、Project、Paper／原生 Markdown、PDF 與並排閱讀／自動發現屬性與關聯／重新命名與刪除／置頂／Inbox 匯入整理／明暗模式與較窄視窗／停用插件後的檔案可讀性。
4. 測試假資料只放 `99 System/Demo/`，測後清除。若暫時把插件內容根目錄映射到 Demo（明確設定的根目錄可覆蓋 System 排除），驗證後恢復 `data.json` 的正式路徑。
5. 完成後更新驗收紀錄，再交付 V1；手機尚未實機驗證。

## 接續環境

在插件目錄以 Node.js 22+、pnpm 執行 `pnpm install --frozen-lockfile`、`pnpm test`、`pnpm run build`。`pnpm-lock.yaml` 與 esbuild 的安裝允許設定已提交。執行期無第三方框架。修改程式後同步重建 `main.js`。

雲端環境可建置、測試與審查，但若沒有真正可操作的 Obsidian，不能宣稱完成實機 GUI 驗證。不要為了驗證方便另建外部 Web dashboard。

本次只保存進度與推送，未修改產品實作來解決上述 runtime 問題，也未開始依新參考重新設計。
