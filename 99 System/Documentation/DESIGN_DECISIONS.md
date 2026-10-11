# Design decisions · V1

決策日期：2026-10-10。目標環境：macOS，Obsidian 1.14.4，預設主題。

## 1. 選擇混合架構

| 方案 | 優點 | 對這個需求的限制 |
| --- | --- | --- |
| 原生 Markdown／Properties／Bases | 最低程式維護成本、檔案透明 | 首頁、空白狀態、建立流程與物件詳情難以形成一致應用介面 |
| 原生 + CSS／小插件 | 可改善排版及少數操作 | CSS 無法提供完整互動邏輯；多插件之間的導覽與設定容易耦合 |
| 全面自訂插件 | 最大介面控制 | 容易重做 Obsidian 的編輯器、PDF、搜尋與儲存能力 |
| **混合：自訂瀏覽與整理 + 原生內容工具** | 足夠的 UI 控制、一個插件、資料可攜 | 需要維護自訂 UI 及相容性測試 |

採用最後一項。自訂插件處理「找、看關聯、建立、整理」，原生工具處理「編輯、讀 PDF、全文搜尋、檔案與連結」。插件同時提供啟動首頁，不額外安裝 Homepage。

## 2. 使用現行公開 API

已查核官方 TypeScript API 1.14.4、sample plugin、自訂 Views、原生 HTML 元件、React、Deferred views 與 Plugin guidelines。

- `ItemView`／`registerView` 建立工作區；`getLeavesOfType` 與 `revealLeaf` 處理已存在／延遲載入的分頁。
- `Vault`、`MetadataCache` 讀取檔案及屬性；不爬取原生 UI DOM。
- `FileManager.processFrontMatter` 更新指定屬性；`renameFile` 讓 Obsidian 處理內部連結更新。
- `WorkspaceLeaf.openFile` 與原生分割分頁開啟 Markdown／PDF。
- 原生 Search 使用官方 Obsidian URI。沒有使用未公開的 `internalPlugins` 或 `app.commands` 接口。
- 事件監聽與 Markdown render component 依插件／視圖生命周期釋放；卸載不強制關閉使用者分頁。

官方來源：

- [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- [Views](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/User%20interface/Views.md)
- [HTML elements](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/User%20interface/HTML%20elements.md)
- [React guide](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Getting%20started/Use%20React%20in%20your%20plugin.md)
- [Plugin guidelines](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Releasing/Plugin%20guidelines.md)
- [Obsidian URI](https://obsidian.md/help/uri)

## 3. 不使用 React 或 Dataview

官方允許直接使用 HTML 元件，也提供 React 的可選整合方法，並未要求使用特定框架。V1 是有限頁面、表單與檔案列表，TypeScript + 原生 DOM／Modal／Menu 已足夠；沒有必要增加 UI runtime、routing 或 state-management 依賴。

Dataview 的查詢能力在這裡不解決應用導覽或互動建立流程。索引可以直接讀取 Obsidian 已有的 metadata cache。Bases 保留為原生備用瀏覽，沒有成為自訂 UI 的隱藏資料層。

## 4. 資料與呈現分離

七種物件對應普通 Markdown；PDF／圖片保持原檔。歸屬以可讀的 Wikilinks 表示，沒有隱藏 ID 或資料庫。

只有索引、關聯集合、列表篩選及分頁路由是衍生狀態。索引只存在記憶體，啟動重建，事件批次更新；Markdown 正文只在詳情頁按需載入，不在啟動時讀取所有正文。長列表每次最多顯示 50 個，按需載入更多。

不建立未使用的 Cache／Config 資料夾。不在多處維護 CSS、模板或狀態副本。

## 5. 最少 metadata 與明確關聯

- 唯一必要的正式物件欄位是 `type`，其餘按實際需要添加。
- `projects` 統一多專案關聯，包括 Experiment；`course` 保持單一課程關聯。
- `kind` 區分講義、作業、複習與可重用概念（`concept`），不為這些材料增加物件類型。
- `created` 自動填入，Recent 使用 `mtime`，不另寫 `updated`。
- `pinned` 寫在 Markdown；原生 Bookmarks 可自行使用，不強迫同步兩份置頂狀態。
- `source` 供 URL 或 Resource 本地來源；Paper 的 PDF 以 `pdf` 明確表示。
- 沒有理解程度、研究成效、進度或生產力推斷。

## 6. 真實空白狀態與克制設計

空白首頁本身就是可用產品：每個區域有用途說明與明確操作。只顯示從檔案得到的數量；不為畫面填入假資料。

繁體中文主要文字搭配 English 分類名稱；使用 Obsidian CSS variables、系統字體與 Lucide 圖示。類型顏色只是輔助，仍有文字及圖示；按鈕提供 labels、focus states，不能只靠 hover 發現操作。

主導覽七項；Recent、Library 為次要入口。詳情頁再展開資料，首頁不堆滿所有物件。

## 7. 低風險檔案操作

匯入採複製、撞名新增數字後綴，不覆寫既有檔案；原始外部檔案保留。整理附件先建立 companion note，再移動原檔，失敗會顯示可定位的錯誤，不自動刪除使用者資料。更新 frontmatter 保留未編輯的欄位及正文。

檔案跨工具搬移仍有普通 Markdown 連結的限制。建議在 Obsidian 內搬移並啟用自動更新連結，而非引入隱藏 UUID 索引。

## 8. 刻意保留在 V1 之外

沒有日曆、完整任務管理、時間追蹤、背景活動監控、雲端後端、外部網站、知識圖資料庫或自主 AI。

只有實際使用暴露問題後才考慮：建立流程是否還有摩擦、PDF 匯入量是否需要引用工具整合、索引是否需要更精細的增量更新，以及哪一個按需 AI 動作值得加入。V1 不預建這些功能或無作用的設定。


## 9. 科研設計參考的採用（2026-10-10 接續）

使用者要求「參考那份科研文件夾系統設計繼續工作」。本次沿用已說明的最小方案：深化研究，保留 Courses、七種物件與應用式介面；不將原參考的 Task／Milestone 排期系統視為已授權需求。

三分區以 Research 的 Knowledge／Sources／Practice 入口呈現，映射到現有 Notes／Papers／Experiments 與 Project。資料夾不重新搬家，不複製跨專案論文，不引入第八種物件。Concept 是 Note 的模板變體，按實際重用需求建立。

Paper 範本加入逐頁批注、問題與局限、知識與實驗線索；Project 加入判斷標準與成果證據。來源辨識僅接受明確 arXiv／DOI URL；不查網路、不猜測題名、不覆寫已標注 PDF，保留版本號。沒有來源或同內容不同 PDF 的自動辨識，仍需人核對。

PDF++／Paper Importer 是參考環境的工具，沒有複製其安裝假設。當前使用原生 PDF 並排及頁碼連結；按選區反向高亮與自動下載需有實際需求後另做兼容性驗證。

簡化檢查：沒有新資料庫、隱藏識別碼、AI 服務、任務層級或必填表單。只有一個 Concept 模板、來源辨識與數個介面入口；核心內容仍全部保存在檔案。

## 10. Runtime 相容性修復

實機 Console 顯示 Obsidian 初始化呼叫自訂的 `WorkspaceView.open`，沿 `openFile(undefined)` 失敗；該名稱碰撞未由公開型別檔提示。改成 `openEntry`，讓繼承的視圖生命週期處理初始化。修正後實機 Home 正常；以主機邊界測試防止同名回歸，不能用它替代 GUI 驗收。

重新命名可能早於 metadata cache 搬移完成。索引在 `resolved` 後重新投影檔案，並在批次更新時重讀暫缺 cache 的項目；避免 type 遺失。依舊只讀 cache，不讀所有 Markdown 正文，不保存獨有資料。

## 11. 使用者新增首頁待辦與專案進度

使用者後續明確要求首頁待辦（不是日曆）與各專案進度，並希望每天由 AI 更新。這項新要求取代原先對所有任務／進度欄位的排除；範圍僅是普通核取清單與明確百分比，不加入 Milestone 階層、排期依賴或生產力推斷。

待辦存在 Notes/Tasks.md，仍是 Note，沒有新增物件類型。Project 只新增選填 progress，不儲存 UI 專用進度快取。空值與 0% 區分；外部 AI 修改後，由 Vault 事件刷新。勾選透過 Vault.process 原子修改並核對原行，遇到同時改寫則提示重新查看。

每日自動執行尚未配置；先建立可由人與 AI 共用的檔案格式與 AI_WORKFLOW 約定。定時任務若日後啟用，須有時間和可靠進展來源，不讓排程自動猜測成果。

## 12. 日常工作台增量（2026-10-11）

使用者的新附件明確授權基本周日曆、任務詳情、工作記錄、按需日記和續接，優先於上面的歷史 V1 範圍排除。保留目前原生 DOM／TypeScript／ItemView、七物件、PDF 並排和索引架構；沒有新依賴或另一個 App。

- Home 主區域為 Week／Today，次區域共用待辦與有來源續接，課程／研究折疊；Recent、Pinned、Library 改為查找入口。
- 安排是 Note 的 schedule 變體，一項一檔；工作記錄是 work-log，日記 journal。選填 ID 在 YAML／Obsidian block refs，可用外部工具讀取，不引入数据库。
- 日期邏輯獨立，使用 Intl／ISO instant，避免 OS 本地格式與夏令時間默默漂移；歧義時拒絕保存。15 分鐘只限制拖拽，表單可精確輸入。
- PortableStore 以 Vault.process 重讀和完整快照檢查，修改指定屬性，保留 unknown metadata／正文。YAML 可能重新排版；不是跨檔案交易。衝突時保留草稿並顯示路徑。
- 封存安排而不永久刪除；分頁內最近一次操作可撤銷，重新載入仍可移除 archived 恢復。相同操作 token 防止捕捉重試建重複檔案。
- Tasks.md 延續單一清單；行內選填優先級、日期、候選狀態，連結時才補 block ID。安排／任務／記錄不同狀態，沒有活動量推算。
- 四段式分組是確定性操作：一般文字放過程，完整四段式原樣保留。原文折疊區與可改草稿分開；日記再組合先對照，明確套用。沒有假 AI 按鈕。
- 容器查詢在 1024／850／580px 調整：窄版周日曆切議程，Today 為單日；表單替代所有拖拽。CSS 僅 lr-workspace／lr-modal 範圍。Cmd／Ctrl+Enter、原生 Escape／Tab 支援。

每周重複、系列修改、CSV／ICS 課表匯入、手動工作時段和認可檢查點進度计算保持後續項，不放無作用按鈕。這些需要先完成現有保存與實機回歸，不以原附件中的候選方向擴大外部服務權限。
