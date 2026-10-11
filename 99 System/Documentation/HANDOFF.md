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

## 2026-10-11：功能與 UI 完善接續（最新範圍）

使用者最新附件明確授權基本周／今日安排、任務詳情、工作記錄、日記與續接；取代前文「不是日曆」「沒有加入排期」的歷史限制。仍不做雲端／外部 API、發布推送、常駐服務或定時 automation。此次沒有 commit／push 授權。

### 已寫入程式

- Home 改為 Week／Today 主區、共用待辦與續接，課程／專案方向折疊；增 Tasks、Records，保留所有原分類、查找／置頂、PDF 並排和 Inbox 整理。
- Notes/Schedule 的 schedule Note：點／拖建、拖移、底邊調整、表單精確時間、任務／課程／專案關聯、重疊提示、複製、封存／撤銷。UTC instant + 可配置 IANA 時區，DST 歧義停止保存，無系列／課表匯入。
- Tasks.md 沿用 checkbox。詳情、優先級／日期、候選建議採納、block ID 連結、相關記錄／安排、重新開啟，課程／Project／Paper 共用。支援單一 kind:tasks 清單重新命名發現；多份時停止並提示。
- work-log Note 保存原始輸入與四段式草稿。原文折疊、正文修正、來源開啟、複製整理指令（不是模型呼叫）、範圍選擇及本地預覽／匯出。
- journal Note 只組合已有同日期記錄；載入既有修正、重新組合先對照明確套用、快照保存衝突保護。
- Home／Project 續接來自最近來源記錄；缺資料就尚未記錄。沒有第二份 Context 資料表、模型、監控或手動計時器。
- 重試操作 ID 防止重複捕捉；PortableStore 的原子修改核對完整原文，正文與未知 YAML 屬性保留。新增 Work Record 範本，Experiment 之後新建使用四段式；既有實驗未改文。

### 驗收限制與接續

最終 55／55 測試通過（51 單元／主機邊界 + 4 模擬 UI），TypeScript／build 成功，main.js 已更新，沒有新依賴。模擬 UI 沒有排版引擎，不能當作桌面拖拽與主题证据。

新首頁曾在真正 Mac Obsidian 1.14.4 透過停用／啟用既有插件成功載入，觀察到周日期、空安排、待辦、續接空狀態與折疊方向。此後 Mac 鎖定，工具明確回報無法解鎖；已要求使用者解鎖。後續 source 改動已建置，但不能將先前首頁載入當作最終所有流程驗收。詳見 VALIDATION 本輪紀錄。

不得宣稱新拖拽、記錄／日記與 Windows 已通過；需解鎖後在隔離 Demo 根目錄續測。正式 data.json 已還原；不要直接在真實 Tasks.md 加假待辦。之前 Demo 測試配置備份在 /tmp/personal-workspace-20261011-qa/data.json；主題備份 appearance.json；user-files.json 是正式內容指紋，只供本機清理核對，不需提交。

本輪尚未實作每周重複／單次與系列修改、CSV／ICS 匯入、手動工作時段與檢查點計算。沒有假按鈕。下一步先完成下面的手動驗收，而不是擴展外部整合。

### 解鎖後接續結果（最新）

Mac 已解鎖，1.1.0 最終建置已真正載入並驗證主要新增流程；前節鎖定是中途 checkpoint，不再是待解鎖阻礙。56／56 測試（52 單元／主機邊界 + 4 模擬 UI）與 build 通過，main.js 約 151.8 KiB。

實機修正了 PortableStore 未排除範本／系統文件導致假續接、日曆 pointer capture 使點擊不能開詳情，以及窄 Today 重複議程。已操作安排建立／拖移／底邊調整／複製／重疊／封存撤銷／重載，待辦修改／完成重開／原生重新命名，工作記錄原文／修正、日記保留／對照／本地匯出，以及快照衝突停止覆寫。窄原生分割與明暗首頁已觀察；Windows 與精確尺寸矩陣未驗收，其他限制見 VALIDATION。

6 個 GUI 測試檔已移出 Vault；正式內容指紋、data.json、appearance.json 核對還原，正式 Home 已重新載入。不要再次要求解鎖以做已完成的驗收。沒有 commit／push 授權，工作樹仍是本地修改。
