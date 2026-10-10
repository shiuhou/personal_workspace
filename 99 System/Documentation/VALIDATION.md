# Validation · 2026-10-10

環境：macOS、Obsidian 1.14.4、預設主題。只使用本地 Learning & Research Workspace 插件。以下區分自動檢查與真正的桌面操作；模擬 API 通過不等於 Obsidian 實機通過。

## 自動檢查

- `pnpm test`：37／37 通過。涵蓋 metadata 正規化、關聯、Inbox／Recent、檔名路徑、建立／撞名／匯入／整理及失敗保留、未知屬性及正文保護。
- 新增 arXiv／DOI URL 辨識、來源重複重用、版本與 PDF 衝突保護、概念來源繼承、rename／resolved 索引更新及雙向引用測試。
- 視圖測試模擬主機呼叫繼承的 `open()`，防止再次被內容開啟方法覆蓋。這只是主機邊界回歸測試。
- `pnpm run build`：TypeScript 檢查與打包通過，`main.js` 已同步重建；無新增依賴。
- 5,000 筆純資料查詢通過，不代表真實大型 Vault 啟動效能。

## 實際 Obsidian 桌面觀察

| 操作 | 觀察結果 |
| --- | --- |
| 啟動插件、開啟 Home | 先重現 Uninitialized／undefined；Console 堆疊證實 `open` 名稱碰撞。改用 `openEntry` 並重新載入後，首頁與空白狀態正常顯示 |
| 建立 Course、Project、Paper | 由介面建立，原生 Markdown 編輯器開啟；type、專案關聯與 PDF 屬性自動被發現 |
| Course 聚合 | 帶 course／kind 的講義出現在 Lectures，其餘組別維持清楚空白狀態 |
| Project 聚合 | 新增論文及概念後，專案自動出現相關項目和正確數量 |
| Paper → 概念 | 建立概念筆記，保留專案關聯，正文帶來源連結；論文相關內容自動顯示此筆記 |
| PDF 與筆記並排 | 實際原生分割視圖顯示 QA PDF 與 Markdown 閱讀筆記 |
| 原生重新命名 | Obsidian 通知更新內部連結；概念正文引用改為新名。修復 cache 時序後，再次重新命名無須重載仍保留 Paper 類型及專案／Inbox 聚合 |
| Experiments | `failed` 實驗列出並清楚標示失敗 |
| Ideas | 空白狀態與捕捉流程正常；捕捉後筆記出現在 Ideas 和 Inbox |
| Inbox | 同時呈現未分類 Markdown、想法和 status=inbox 的論文；整理 Markdown 至 Note 後離開 Inbox，正文保留 |
| 原生 Search | 工作區搜尋開啟 Obsidian Search，`[type:paper]` 能找到測試論文 |
| Research 介面 | Knowledge／Sources／Practice 入口、實際數量與專案區正常呈現 |
| 明暗模式 | 在實際應用檢視淺色、深色畫面；文字、卡片及操作可讀 |
| 較窄面板 | 左側原生搜尋展開後仍可操作，布局能換行；不代表手機驗收 |

## 清理與最終狀態

所有測試內容只放在 `99 System/Demo/`。測試結束已移除九個 QA 檔案及 Demo 目錄，正式內容資料夾沒有加入假課程／論文。`data.json` 已從測試前備份還原正式路徑，appearance 設定已還原跟隨系統。

本輪新增 Tasks 與 progress 實測。還原正式設定後，正常退出並重啟 Obsidian，觀察到正常 Home、空待辦及 QA 分頁已消失。Force Reload 曾留下空白視窗，正常重啟可恢復；此現象尚未定位根因。

## 尚未實機覆蓋

- 外部檔案選擇器／拖放匯入、來源 URL 去重及衝突提示有自動測試，但未逐項走完 GUI。
- 尚未逐一操作所有狀態篩選、插件停用／重新啟用，以及刪除後的即時 UI 更新。
- 未在手機、第三方主題及真正大型 Vault 測試。
- 未安裝 PDF++／Paper Importer；原生頁碼連結之外的選區批注、自動下載不在此次交付。

核心資訊是普通 Markdown／YAML 與本地附件，索引只是可重建記憶體投影；沒有將知識寫入獨有快取或外部服務。

## 首頁待辦與進度補驗

- 真實 GUI 新增 `QA 手寫待辦 [[QA Progress]]`，連結可呈現；勾選後檔案保存 `[x]`，顯示已完成仍可找到。
- Project 空值顯示「尚未設定」，透過進度視窗填 35，GUI progress 指標和 YAML 均為 35；未知屬性與正文保留。
- 在 Demo 檔案模擬 AI 改為 60% 並追加待辦，Research 的 progress 指標及 Home 待辦清單更新；不需插件專有快取。
- 置頂按鈕寫入 `pinned: true`，Home 的 Pinned 區顯示專案。
- 深色模式實際畫面可讀；新增的待辦／進度元件尚未另做淺色操作驗收，先前基礎介面的明暗驗證仍有效。
- 外部匯入選擇器可打開，但前往路徑視窗未正常呈現，已取消；沒有將「打開選擇器」算作完成匯入。
- 本輪三個測試檔案只位於 Demo，已清除，沒有把測試待辦留在正式 Tasks.md。
