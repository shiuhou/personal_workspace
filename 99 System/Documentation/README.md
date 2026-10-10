# Learning & Research Workspace

這個 Vault 是一個以本地檔案為資料來源的學習與研究工作區。自訂插件提供導覽與整理介面；Obsidian 提供 Markdown 編輯、PDF 檢視、檔案、連結與搜尋。

> 2026-10-10：載入與重新命名索引問題已修復，研究設計已融入現有介面。37 項自動測試通過，並已在 Obsidian 1.14.4 驗證主要建立／閱讀流程與明暗模式。完整驗證範圍與尚未覆蓋的項目見 [[VALIDATION]]。

[開啟 Workspace](obsidian://learning-research-workspace?vault=personal_os) · [[00 Home/Home|原生備用入口]] · [[00 Home/Library.base|原生資料瀏覽]] · [[DESIGN_DECISIONS|設計決策]]

## 從第一份內容開始

### 第一門課程

1. 在 Home 選「建立課程」，或執行 `Learning & Research Workspace: New course`。
2. 輸入課程名稱，選「建立並開啟」。只需要標題。
3. 在原生編輯器寫課程概覽。回到 Workspace 的 Courses 可進入課程詳情。
4. 在課程頁的 Lectures、Notes、Assignments、Resources 或 Review 選「新增」。建立的筆記會帶入 `course` 關聯；必要時帶入 `kind`，不用另外維護清單。

### 第一個研究專案

1. 在 Home 選「建立研究專案」，或執行 `New research project`。
2. 輸入名稱，開始寫「研究問題」「判斷標準」「當前重點」「重要決策」「成果與證據」。
3. 從 Project 詳情頁新增論文、筆記、實驗、想法或資源，會自動帶入專案關聯。
4. 已有資料可用「編輯屬性」加入 `projects`，或在原生 Properties 編輯。多個專案可以共享同一篇論文。

### 第一篇論文

1. 開啟 Papers，選「新增論文」，或執行 `Add paper`。
2. 輸入標題。可選 Vault 裡的 PDF，或從電腦匯入 PDF；沒有 PDF 也能先建立閱讀筆記。
3. 展開「關聯與來源」可選研究專案、課程或填來源網址，全部選填。
4. 建立後，論文筆記在 `30 Papers`，匯入的 PDF 在 `80 Attachments`。初始 `status: inbox` 表示待整理，不表示正在閱讀。
5. 在論文詳情頁開啟 PDF，或選「PDF ＋ 閱讀筆記」使用兩個原生分頁群組並排閱讀。
6. 讀到什麼就記錄什麼；不自動生成摘要。作者、年份、主題與 PDF 連結也可稍後在原生 Properties 補上。

同一個本地 PDF，或相同的明確 arXiv／DOI 來源 URL，會重用已有主筆記並合併專案關聯，保留手寫正文、閱讀狀態及原 PDF 錨點。arXiv 的 abs／pdf URL 可互相辨識，但 v1、v2 與未指定版本的 URL 分別處理。遇到來源與 PDF 衝突或多份同來源主筆記會停止，請先核對。若選了外部 PDF 且來源已存在，請「清除 PDF 選擇」後開啟原筆記。

不憑標題相似度、一般網站 URL 或 PDF 內容判斷同一論文；沒有穩定来源的另一份 PDF 仍可能重複。來源 URL 不會自動下載原文或查詢出版資訊。

## 知識、來源與實踐

Research 頁提供三個入口，都是現有檔案的檢視，不新增重複資料：

- **Knowledge** → `40 Notes` 等位置中標記 `type: note` 的知識與筆記，包含課程可重用內容。保留長筆記，出現重用需要才使用 Concept 範本拆出概念。
- **Sources** → Papers。一篇論文共用一份主筆記與 PDF；逐頁引用與自己的理解分開寫。
- **Practice** → Experiments。Project 保存研究問題、判斷標準、決策與成果連結；Experiment 保存方法和證據，包括失敗與反證。

論文詳情提供「建立概念筆記」及「記下實驗線索」，自動帶入 `projects`／`course`，並在新筆記正文加入指向論文的來源連結。相關內容會依明確的雙向引用自動發現，不把同專案的所有資料都算成相關。

概念仍是 `type: note`，只多一個選填 `kind: concept`。Research → 知識與理解也能直接建立概念，Library 的「可重用概念」可單獨篩選。一般筆記維持輕量，沒有強迫拆分或自動補完推導。

PDF 頁碼引用使用 `[[80 Attachments/檔名.pdf#page=3|第 3 頁]]`，引文後另寫自己的解讀。PDF++ 與 Paper Importer **沒有安裝**，並非必要依賴；選區高亮、arXiv 自動下載不在本次實作中。若日後確實需要，先在獨立測試 Vault 驗證與一份主筆記的相容性，再決定是否引入；不要讓其他導入器覆寫已有閱讀理解。

## 日常使用

### 首頁待辦與專案進度

首頁「今日與接下來 Tasks」可直接新增一行待辦、勾選完成及顯示已完成項目。原始資料在 `40 Notes/Tasks.md`，第一次新增才建立，內容是普通 Markdown `- [ ]`／`- [x]` 清單。可用 Wikilinks 連回課程、專案或論文；沒有自動清空、逾期懲罰或假任務。

「開啟原始清單」可編輯多行、重排或刪除項目。程式忽略 fenced code block 裡的範例核取方塊。尚未填寫的清單呈現空白狀態；首頁先顯示八項，可載入更多。更改 Notes 根目錄後會讀取新位置的 Tasks.md，不會搬移舊檔案。

Project 卡片和詳情提供「設定／更新進度」，以數字 `progress: 0` 至 `progress: 100` 保存在專案 Markdown 的 Properties。缺值或無效數字顯示「尚未設定」，不當成 0%；100% 也不會擅自更改專案 status。首頁顯示進行中專案，Research 可以查看其他狀態的專案進度。

你每天可讓 AI 更新 Tasks.md 及專案的 progress；修改檔案後介面會自動刷新。更新約定見 [[AI_WORKFLOW]]。本插件不含 AI 服務或計時器，目前沒有建立每天自動執行的排程。

### 收集與整理 Inbox

- 「新增 → 快速收集」接受文字、URL、AI 回覆。只需內容，不要求分類。
- 「捕捉想法」會加上 `type: idea`，仍放在 Inbox 等待整理。
- 把檔案拖到 Inbox 的匯入區，或選「匯入檔案」。匯入是複製到 Vault，原始外部檔案保留。
- Inbox 包含實體 `01 Inbox` 內的檔案，以及任何明確標示 `status: inbox` 的內容。同一個檔案只計算一次。
- 選「整理」設定類型、狀態與選填關聯。Markdown 全文保留並移至對應資料夾；PDF／圖片等附件保留原檔，配上一份 Paper 或 Resource 說明筆記。
- 已整理的一般筆記、想法與資源可選「未指定」狀態。論文可選 `reference`、`reading` 等符合實際情況的狀態。檔案仍在實體 Inbox 時，即使改了狀態仍會列出。
- 不需要每天清空 Inbox。

### Recent、置頂與封存

- Recent 是最近修改的檔案，依檔案系統 `mtime` 排序。它不是閱讀紀錄；同步、複製、Git 還原或批次修改可能改變這個時間。
- 點內容列的圖釘或詳情頁「置頂」，會在 Markdown 寫入 `pinned: true`。附件可透過其 Paper／Resource 說明筆記置頂。
- 已封存的內容仍保留在原資料夾，以 `status: archived` 表示。分類頁「全部」仍可找到；Home 不顯示已完成／已封存的課程，只顯示明確 `active` 的研究專案。
- 實驗 `failed` 不會被排除。結果與解讀由人記錄，系統不推斷成功或理解程度。

### 搜尋與開啟檔案

- 頂部「搜尋」呼叫 Obsidian 原生全文 Search。
- 分類頁的搜尋框只篩選目前列表的標題、作者、主題、年份與狀態，不另建全文搜尋索引。
- 內容列右側箭頭直接在原生分頁開啟檔案。Course、Project、Paper 的標題進入自訂詳情頁；Note、Experiment、Idea、Resource 標題直接開啟原生筆記。
- Library 集中瀏覽筆記、資源與附件。Recent 和 Library 是次要導覽，不增加更多主要分類。
- `Cmd+O` 保留原生快速切換。搜尋範例：`[type:paper]`、`[type:experiment] [status:failed]`、`path:"01 Inbox"`。

## 資料架構

```text
personal_os/
├── 00 Home/                 原生備用入口與 Library.base
├── 01 Inbox/                快速收集、尚未整理的混合檔案
├── 10 Courses/              Course 主頁
├── 20 Research/             Project 主頁
├── 30 Papers/               論文閱讀筆記
├── 40 Notes/                課堂、概念、作業、複習筆記
├── 50 Experiments/          實驗紀錄
├── 60 Ideas/                整理後的想法
├── 70 Resources/            參考資料說明筆記
├── 80 Attachments/          PDF、圖片及其他附件
├── 90 Templates/            七種物件範本 + Concept 筆記變體
├── 99 System/Documentation/ README.md、DESIGN_DECISIONS.md、HANDOFF.md、VALIDATION.md、References/
└── .obsidian/               原生配置、自訂插件與完整原始碼
```

資料夾是預設存放處。物件發現依 `type`，關聯依連結，不要求每個課程或專案有自己的資料夾樹。`00 Home`、範本、`99 System`、根目錄的 README／AGENTS、隱藏檔案不混入日常內容列表。設定中明確指定的資料根目錄可覆蓋系統資料夾排除規則。

未分類的 Markdown 和非 Markdown 檔案仍可在 Inbox、Recent、Library 出現。Canvas、Bases、圖片及 PDF 交給 Obsidian 原生處理；其他格式可由檔案瀏覽器交給系統應用程式。

## Properties 屬性

正式物件只有 `type` 必填；快速捕捉可以沒有 `type`。不要為了填滿表格增加欄位。

| 屬性 | 型別／用途 |
| --- | --- |
| `type` | `course / project / paper / note / experiment / idea / resource` |
| `status` | 選填文字，表達人明確指定的狀態 |
| `created` | 範本自動填入 `YYYY-MM-DD`；不是活動追蹤 |
| `projects` | 研究專案 Wikilink 清單，支援多個專案 |
| `course` | 單一 Course Wikilink |
| `kind` | 選填 `lecture / assignment / review`；概念筆記用 `concept`；首頁待辦清單用 `tasks` |
| `topics` | 選填文字清單，不要求預建 topic 物件 |
| `progress` | Project 選填 0–100 數字，由人或經授權的 AI 更新 |
| `pinned` | 選填布林值 `true`；普通內容可省略 |
| `authors` | Paper 選填文字清單 |
| `year` | Paper 選填出版年份 |
| `pdf` | Paper 的本地 PDF Wikilink |
| `source` | Paper 的來源 URL；Resource 可填 URL 或本地附件 Wikilink |
| `date` | Experiment 選填的實際實驗日期 |

不維護 `updated`；Recent 使用原生檔案修改時間。不新增未被使用的 `module`、隱藏 ID、進度或生產力欄位。

### 狀態

| 物件 | 可用狀態 | 範本初始值 |
| --- | --- | --- |
| Course | planned, active, completed, archived | active |
| Project | active, paused, completed, archived | active |
| Paper | inbox, skimming, reading, synthesized, read, reference, archived | inbox |
| Experiment | planned, running, completed, failed, paused | planned |
| Idea | inbox, archived；整理後也可不填 | inbox |
| Note | inbox, archived；平時不必填 | 無 |
| Resource | inbox, reference, archived；平時不必填 | 無 |

未知的狀態不會被刪除或覆寫，可在原生屬性中自行調整。範本初始值是可編輯的預設，沒有自動狀態推斷。

### 連結約定

以下僅為語法範例，不代表 Vault 內已有這些資料：

```yaml
projects:
  - "[[20 Research/你的研究專案]]"
course: "[[10 Courses/你的課程]]"
pdf: "[[80 Attachments/你的論文.pdf]]"
```

- 使用 Obsidian 的連結解析，支援完整路徑、短連結、別名與 heading。
- 新寫入的關聯使用完整 Vault 相對路徑，避免同名歧義。
- 舊的單數 `project` 可讀取；經關聯編輯後統一寫為 `projects`。
- 用原生 Obsidian 搬移／重新命名，或 Workspace 的整理操作，並保持「自動更新內部連結」啟用。外部檔案工具直接搬移不保證引用自動修復；斷連結仍保留可讀文字。
- Paper 詳情的相關筆記／實驗，顯示明確連結到該 Paper，或由該 Paper 指向的知識／實驗等內容，不把所有同專案實驗推斷成相關。

## 範本

[[90 Templates/Course|Course]] · [[90 Templates/Research Project|Research Project]] · [[90 Templates/Paper|Paper]] · [[90 Templates/General Note|General Note]] · [[90 Templates/Experiment|Experiment]] · [[90 Templates/Idea|Idea]] · [[90 Templates/Resource|Resource]] · [[90 Templates/Concept|Concept（Note 變體）]]

原生 Templates 與 Workspace 共用同一份 Markdown。Workspace 支援 `{{title}}`、`{{date}}`、`{{time}}` 及日期／時間格式，不執行模板 JavaScript。直接修改範本會影響之後建立的物件，不會改動已有筆記。編輯範本建議使用 Source mode，避免 Properties UI 將佔位文字轉型。

## 插件、命令與設定

唯一必要的社群插件是本地自訂 **Learning & Research Workspace**，版本 `1.0.0`，插件 ID `learning-research-workspace`。沒有 Dataview、Homepage、Templater 或其他社群依賴。

原生 Search、Templates、Properties、Backlinks、Bookmarks、Quick switcher 繼續使用；Bases 只供備用 Library，不是自訂 UI 的執行依賴。Canvas 保留原生能力。既有其他核心插件設定保留，沒有新增每日記錄或雲端同步流程。

命令面板提供：

- Open Workspace / Open Inbox
- New course / New research project / Add paper
- New note / New experiment / New resource
- Capture idea / Quick capture
- Rebuild workspace index

不搶占系統或其他插件快捷鍵，可在 Obsidian Hotkeys 自行配置。建立視窗支援 `Cmd/Ctrl+Enter` 提交；Tab、Enter、Escape 使用原生控制項。

設定只包含啟動首頁、預設存放資料夾／範本資料夾與重建索引。改存放位置不會批次搬移舊內容。不存在空的 AI 設定或無作用的按鈕。

## 插件原始碼與建置

插件原始碼放在 `.obsidian/plugins/learning-research-workspace`，和建置產物一起可備份：

```text
learning-research-workspace/
├── src/
│   ├── main.ts              生命周期、命令、原生整合
│   ├── contracts.ts         UI 與服務之間的介面
│   ├── domain.ts            七種物件、正規化、純查詢
│   ├── settings.ts          少量設定
│   ├── data/index.ts        可重建的記憶體索引與關聯
│   ├── data/tasks.ts        普通 Markdown 待辦與安全勾選
│   ├── ui/planning.ts       專案進度編輯
│   ├── data/actions.ts      建立、匯入、屬性更新、整理
│   ├── ui/components.ts     按鈕、空白狀態等共用元件
│   ├── ui/modals.ts         建立、捕捉、整理與關聯選擇
│   └── views/workspace-view.ts  應用導覽與各頁面
├── tests/                   domain、FileActions 與 Obsidian 測試替身
├── scripts/                 建置與測試入口
├── styles.css               限定作用範圍的明暗樣式
├── main.js                  Obsidian 載入的產物
├── manifest.json
├── data.json                只有 UI／資料夾偏好
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

使用 Node.js 22 或更新的相容版本與 pnpm，在插件目錄執行：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run build
```

開發依賴是 TypeScript、esbuild、Obsidian API 型別與 Node 型別。插件執行期只用 Obsidian 提供的 API，沒有 React 或第三方 UI runtime。採用 Obsidian `ItemView` 與原生 DOM／Modal／Menu；樣式在插件 `styles.css`，沒有重複維護的 CSS snippet。

修改程式後重新建置，再在 Community plugins 停用／啟用插件，或重新載入 Obsidian。不要在編輯未儲存的重要筆記時強制重新載入。

## 備份與移轉

- 備份整個 Vault，包含 `.obsidian`（隱藏目錄）、插件原始碼、範本與附件。
- `.gitignore` 排除 `node_modules`、暫存視窗布局、系統垃圾與測試 Demo；保留穩定設定和編譯好的插件。`.gitkeep` 讓空資料夾也能隨 Git 保存。
- Git 適合 Markdown／程式版本管理；大量或大型 PDF 是否改用 Git LFS，等實際容量需要時再決定。V1 不自動初始化遠端、傳送資料或建立備份排程。
- 卸載插件不刪除筆記。普通文字、YAML、Wikilinks 與附件仍可在 Obsidian 或其他工具閱讀。原生 Home／Library 是備用導覽。
- 索引只存在記憶體，不需備份、不含唯一資訊；重启即可重建。插件設定 JSON 只記住路徑及 UI 偏好。

## 未來的 AI 擴充

擴充點是單一物件及其明確關聯：從 `VaultIndex` 取得路徑，透過 Vault API 按需讀取所需筆記，將動作接到命令／詳情頁。`WorkspaceHost` 將 UI 與檔案操作分開。

若未來加入摘要、比較或複習功能，應保存來源、區分引文與推論，將經確認的文字寫回普通 Markdown。保持供應商介面獨立，不讓 UI、索引或資料格式綁定 AI 服務。V1 沒有網路 AI 呼叫、API key、背景監控或自動改寫。

## 已知界線

- 以目前 Mac 的 Obsidian 1.14.4 為目標；程式不使用 Node/Electron runtime API，但未因此宣稱已完成實機手機驗收。
- 來源與附件不做 OCR、全文 PDF 索引、引用格式管理或內容雜湊去重。
- 關聯編輯、置頂會使用原生 `processFrontMatter`，因此 YAML 排版可能依 Obsidian 規則重整；正文和未編輯的欄位保留。
- 檔案移動與建立不是跨檔案交易；若操作中途失敗，介面顯示錯誤並保留已建立內容／原始附件，不以自動刪除掩蓋失敗。
- 停用自訂 UI 後，編輯與檔案仍可用，但自訂導覽與操作不會存在。

## 驗收紀錄

2026-10-10：37 項自動測試通過，TypeScript 與打包成功。Obsidian 1.14.4 已正常顯示 Home 與 Research；實機驗證建立 Course、Project、Paper、Concept、Idea、專案關聯、PDF 並排、重新命名、原生搜尋、Inbox 整理與明暗畫面。詳見 [[VALIDATION]]，其中明確分開模擬 API 與 GUI 證據。
