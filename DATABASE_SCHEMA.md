# 公司零用金財務管理系統 — 資料庫綱要與欄位字典 (DATABASE_SCHEMA.md)

本文件完整收錄「公司零用金管理與開支分析系統」後端 SQLite 實體資料庫的所有資料表、欄位定義、商業邏輯意義與程式使用指引。

> **💡 開發者重要指引：**  
> 未來若有任何新程式、新報表模組、外接腳本（Python / C# / Excel VBA / BI 工具）或新增功能，**請優先查閱本表**。現有資料庫結構已具備財務傳票編號、發票號碼、經辦請領人、歷史靜態快照、專案子帳溯源等豐富維度，**可直接下 SQL 撈取現成數據，毋需額外重複建立資料表或欄位**。

---

## 目錄
1. [資料庫基本技術規格](#一資料庫基本技術規格)
2. [資料庫整體關聯與架構總覽](#二資料庫整體關聯與架構總覽)
3. [資料表 1：`transactions`（零用金核心收支流水帳）](#三資料表-1transaction-零用金核心收支流水帳)
4. [資料表 2：`categories`（多階層分類與自訂選單）](#四資料表-2categories多階層分類與自訂選單)
5. [資料表 3：`claimants`（經辦同仁與請領人名冊）](#五資料表-3claimants經辦同仁與請領人名冊)
6. [資料表 4：`budgets`（月份預算與安全水位設定）](#六資料表-4budgets月份預算與安全水位設定)
7. [資料表 5：`sub_accounts`（專案採買專款子帳戶）](#七資料表-5sub_accounts專案採買專款子帳戶)
8. [資料表 6：`director_withdrawals`（廠長/主管專用提領紀錄）](#八資料表-6director_withdrawals廠長主管專用提領紀錄)
9. [現成資料直接撈取指南（免重複設欄位之關鍵設計）](#九現成資料直接撈取指南免重複設欄位之關鍵設計)
10. [常用 SQL 快速查詢範例（隨查隨用）](#十常用-sql-快速查詢範例隨查隨用)

---

## 一、資料庫基本技術規格

| 規格項目 | 內容說明 |
| :--- | :--- |
| **檔案路徑** | `/data/petty_cash.sqlite`（專案根目錄下 `data/` 資料夾） |
| **資料庫引擎** | **SQLite 3**（支援標準 SQL 語法、ACID 事務保證） |
| **文字編碼** | **UTF-8**（支援繁體中文、特殊字符、Emoji） |
| **連線相容性** | 支援標準 `sqlite3` 命令列工具、`DB Browser for SQLite`、Python `sqlite3`、Node.js `better-sqlite3` / `sql.js`、DBeaver、Excel ODBC 等 |
| **備份與攜帶** | 單一檔案封裝，隨時可複製該檔案帶走或置入隨身碟換機運作 |
| **全端 API 介面** | 透過 `server.ts` 提供 RESTful API (`/api/transactions`, `/api/bootstrap` 等) |

---

## 二、資料庫整體關聯與架構總覽

```
┌─────────────────────────────────────────────────────────────┐
│                      petty_cash.sqlite                      │
└─────────────────────────────────────────────────────────────┘
          │
          ├─► [transactions]          核心總帳（每筆零用金收支、發票、傳票）
          │         ▲
          │         └── 由 sub_accounts 採買明細批次匯入（含來源追蹤溯源）
          │
          ├─► [categories]            主分類、階層細項選單、視覺顏色與圖示
          │
          ├─► [claimants]             常用經辦同仁/請領人快速選單名冊
          │
          ├─► [budgets]               月份預算額度與警戒百分比設定
          │
          ├─► [sub_accounts]          專案採買備用金子帳（小明午餐、工地採買）
          │         └── items (JSON)  子帳每日採買收據、開支細項
          │
          └─► [director_withdrawals]  主管/廠長專用提款備用金核對表
```

---

## 三、資料表 1：`transactions`（零用金核心收支流水帳）

### 1. 資料表簡介
記錄公司零用金的所有歷史流水帳（包含各項支出報銷，以及零用金歸墊撥補）。每一筆紀錄皆具備**歷史快照（Snapshot）**特性，即使日後分類名稱或代碼變更，亦不影響歷史帳目。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 唯一交易代碼 (UUID / 時間戳 ID) | 主鍵識別碼，前後端資料同步、修改與刪除指定目標依據。 | 用於唯一鍵關聯或精確更新。例如 `tx_1726000000_abc`。 |
| **`date`** | `TEXT` | **NOT NULL** | `string` | 交易發生日期 (`YYYY-MM-DD`) | 1. 記帳列表依日期由新至舊排序。<br>2. 月份收支統計、年報篩選。<br>3. 日期區間報表與 Excel 匯出。 | 格式為標準 ISO `2026-09-20`，可直接下 `LIKE '2026-09%'` 篩選整月。 |
| **`type`** | `TEXT` | **NOT NULL** | `'expense' \| 'income'` | 交易收支方向<br>• `expense`: 支出報銷<br>• `income`: 撥補/收入 | 1. 計算餘額：結餘 = SUM(income) - SUM(expense)。<br>2. UI 紅綠色系辨識（收入綠、支出紅）。<br>3. 儀表板收支卡片統計。 | 直接依此欄位分群計算現金流入與流出，免另設收入表。 |
| **`categoryId`** | `TEXT` | **NOT NULL** | `string` | 主分類識別碼 (如 `dining`, `fuel`, `misc`) | 關聯分類設定、圖表分析聚合分組。 | 供系統內部識別與快速統計分組使用。 |
| **`categoryName`** | `TEXT` | **NOT NULL** | `string` | 交易時主分類名稱快照 (如「餐飲開銷」、「車輛油資」) | **靜態快照**：記帳當下的分類名稱。日後即使管理者至設定頁更名分類，歷史紀錄依然完整無損。 | 匯出報表、Excel 試算表時直接讀取，**完全不用 JOIN `categories` 表**。 |
| **`subItem`** | `TEXT` | **NOT NULL** | `string` | 次級細項 / 店家 / 加油站 / 說明快照 | 記錄店家名（如八方雲集、台灣中油）、預支同仁、項目說明。 | 細項統計與搜尋時直接 `LIKE '%中油%'`，無需外部參照表。 |
| **`claimant`** | `TEXT` | NULL | `string \| undefined` | 零用金經辦請領人姓名 (如「王大明 (總務)」) | 1. 查核是「誰」拿憑證來領款。<br>2. 人員請款分析排行榜、防弊稽核。<br>3. 請領人篩選器。 | 可直接 `GROUP BY claimant` 統計同仁每月報銷總額。 |
| **`peopleCount`** | `INTEGER` | NULL | `number \| undefined` | 用餐開銷之參與人數 | 專用於「餐飲」類開銷。用於換算「每人平均餐費」($/人)。非餐飲類此欄為 NULL。 | 想要分析主管便當均價或招待開銷時直接除此欄位。 |
| **`amount`** | `REAL` | **NOT NULL** | `number` | 交易金額 (新台幣 NT$) | 核心金額運算、總額加總、圖表長條圖、比例計算。 | 必須大於 0。 |
| **`note`** | `TEXT` | NULL (預設 `''`) | `string` | 補充備註與事由說明 | 填寫公務事由、出差目的、特殊核銷備註。支援全文字串搜尋。 | 程式搜尋引擎比對目標。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 系統建檔 Unix 時間戳 (毫秒) | 1. 同日多筆帳目之先後次序排序依據。<br>2. 稽核建檔時間與登帳歷程。 | 毫秒數，可用於二次細部排序 `ORDER BY date DESC, createdAt DESC`。 |
| **`receiptType`** | `TEXT` | NULL | `'receipt' \| 'invoice' \| 'none'` | 單據憑證類型：<br>• `receipt`: 收據/免用發票<br>• `invoice`: 統一發票<br>• `none`: 無憑證/內部簽單 | 1. 會計稽核憑證齊全率統計。<br>2. 區分可扣抵稅額與一般收據。<br>3. 報表憑證勾稽篩選。 | 直接撈取即可知道該筆是否有發票或收據，免另開憑證表。 |
| **`invoiceNumber`** | `TEXT` | NULL | `string \| undefined` | 統一發票號碼 (如 `AB-12345678`) | 當 `receiptType` 為 `invoice` 時所記錄之發票字軌與號碼。供查帳與國稅局申報核對。 | 直接用 `WHERE invoiceNumber IS NOT NULL` 即撈出所有發票清冊。 |
| **`voucherNo`** | `TEXT` | NULL | `string \| undefined` | 系統高可讀性傳票號碼 (方案 A) (如 `P2026090714-0001`) | **月份獨立傳票序號**：含年月時段前綴 + 當月 4 碼連號流水號。列印傳票單據與會計憑證貼黏時專用。 | 會計報表與傳票封面直接引用本欄。 |
| **`rawVoucherId`** | `TEXT` | NULL | `string \| undefined` | 帳務小管家原生傳票號碼 (如 `P20260907142530123`) | **外部相容傳票號碼**：以 `P + YYYYMMDDHHmmss + 毫秒` 編碼，與知名桌面財務軟體「帳務小管家」100% 格式相容。 | 匯入匯出外部 ERP 或桌面會計軟體時作為無縫對接鍵。 |
| **`subAccountSourceId`** | `TEXT` | NULL | `string \| undefined` | 來源專款採買子帳戶 ID | 若該筆帳是由採買子帳戶（如小明午餐金結算）匯入總帳，記錄其來源子帳 ID。若為一般手動記帳則為 NULL。 | 追溯該筆帳是哪一個專案或子帳戶結算過來的。 |
| **`subAccountSourceName`** | `TEXT` | NULL | `string \| undefined` | 來源專款採買子帳戶名稱 | 同步儲存子帳名稱快照（如「每週午餐採買 (小明)」）。 | 報表顯示時一目了然，不用二次查詢 sub_accounts。 |

---

## 四、資料表 2：`categories`（多階層分類與自訂選單）

### 1. 資料表簡介
維護零用金系統之所有收支類別設定。採用靈活的多階層架構，每個主分類均包含其專屬的次級標籤名稱與預設細項清單。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 分類代碼 (如 `dining`, `fuel`, `transport`) | 主鍵，與 `transactions.categoryId` 關聯。 | 唯一鍵值。 |
| **`name`** | `TEXT` | **NOT NULL** | `string` | 分類顯示名稱 (如「餐飲開銷」、「車輛油資」) | 前端下拉選單顯示名稱、分類管理清單。 | 分類顯示名稱。 |
| **`type`** | `TEXT` | **NOT NULL** | `'expense' \| 'income'` | 類別屬性（支出分類 或 撥補收入分類） | 前端記帳表單切換「支出」或「收入」時，自動連動篩選出對應的分類選項。 | 抓取所有支出分類：`WHERE type = 'expense'`。 |
| **`icon`** | `TEXT` | NULL | `string` | Lucide 圖示名稱 (如 `utensils`, `fuel`, `coins`) | 前端 UI 渲染分類圖示視覺。 | 提供前端或行動端顯示合適之 Icon。 |
| **`color`** | `TEXT` | NULL | `string` | 分類主題顏色十六進位碼 (如 `#ea580c`) | 1. 記帳選單按鈕底色。<br>2. 圓餅圖與長條圖之配色。<br>3. 標籤 Badge 顏色。 | 繪製圖表時直接取用此色碼，確保圖表與介面色彩一致。 |
| **`subLabel`** | `TEXT` | NULL | `string` | 次級項目之輸入引導標籤 (如「店家/餐飲名稱」) | 提示使用者在輸入細項時該填入什麼（例如加油類提示「加油站名稱」）。 | 前端動態表單 Label 渲染。 |
| **`defaultSubItems`**| `TEXT` | **NOT NULL** | `string` (JSON 字串) | 預設細項快速選單陣列 (JSON 字串) | 前端記帳選中該分類時，自動帶出的常用點選按鈕清單（如八方雲集、中油直營等）。 | 儲存為 JSON 陣列字串，如 `["便當","飲料"]`。可用 `JSON.parse()` 取出。 |
| **`hasPeopleCount`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否啟用「人數」欄位輸入 | 判定選中此分類時，記帳介面是否需要顯示「開銷人數」輸入框。 | 目前餐飲類為 1，其餘為 0。 |
| **`sortOrder`** | `INTEGER` | 預設 `0` | `number` | 顯示排列順序權重 | 分類在前端選單的左右/上下排列優先序。 | 下查詢時搭配 `ORDER BY sortOrder ASC`。 |

---

## 五、資料表 3：`claimants`（經辦同仁與請領人名冊）

### 1. 資料表簡介
記錄常態性向零用金請領款項的同仁、部門或主管清單。供記帳時一鍵快選，避免同仁名字打錯字導致後續統計失真。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`name`** | `TEXT` | **PRIMARY KEY** | `string` | 請領人姓名/職稱 (如「王大明 (總務)」) | 1. 記帳時的請領人下拉選單項目。<br>2. 對應 `transactions.claimant` 欄位值。 | 人名本身即為主鍵，直接 `SELECT name FROM claimants ORDER BY sortOrder ASC`。 |
| **`sortOrder`** | `INTEGER` | 預設 `0` | `number` | 顯示排序權重 | 決定常用請領人在快速點選按鈕上的優先排列順序。 | 依常用頻率升冪排列。 |

---

## 六、資料表 4：`budgets`（月份預算與安全水位設定）

### 1. 資料表簡介
管理每月份的支出預算上限，以及零用金警戒水位門檻。系統以此為依據計算預算達成率、剩餘可用額度，並在水位過低時發出撥補警示。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`yearMonth`** | `TEXT` | **PRIMARY KEY** | `string` | 預算所屬年月 (`YYYY-MM`，如 `2026-09`) | 主鍵，標識該月份的專屬預算設定。 | 直接下 `WHERE yearMonth = '2026-09'` 撈取指定月之預算設定。 |
| **`budgetAmount`** | `REAL` | **NOT NULL** | `number` | 該月預算總額度上限 (NT$) | 1. 當月開銷進度條（已用金額 / 預算總額）。<br>2. 預算超支警示判斷。 | 數值（例：`30000`）。 |
| **`alertThresholdPercent`** | `REAL` | **NOT NULL** | `number` | 零用金安全水位警戒百分比 (如 `20` 代表 20%) | 當零用金剩餘水位低於此百分比時，系統頂部立即跳出「⚠️ 零用金即將告罄，請向會計申請撥補」警示通知。 | 預設為 20。若要計算警戒金額門檻：`budgetAmount * (alertThresholdPercent / 100)`。 |

---

## 七、資料表 5：`sub_accounts`（專案採買專款子帳戶）

### 1. 資料表簡介
針對具備獨立預撥週轉金之特定人員或採買專案（例如：小明每週預領 5,000 元午餐採買金、工地現場採購備用金），獨立開設子帳戶管考其採買明細與結算餘額。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 子帳戶代碼 (如 `sub_1726000000_123`) | 唯一代碼，供專款管考與匯入總帳時之來源溯源識別。 | 唯一主鍵。 |
| **`name`** | `TEXT` | **NOT NULL** | `string` | 子帳戶專案名稱 (如「每週午餐採買 (小明)」) | 列表抬頭、匯入總帳時之來源標籤顯示。 | 識別專案名。 |
| **`custodian`** | `TEXT` | **NOT NULL** | `string` | 專款保管/經辦同仁 (如「陳小明」) | 標明誰拿了這筆專款備用金，負保管與核銷責任。 | 負責人姓名。 |
| **`initialFund`** | `REAL` | **NOT NULL** | `number` | 預先撥發的備用金起點金額 (NT$) | 子帳餘額計算起點：子帳可用餘額 = `initialFund - 累計支出 + 追加款`。 | 起始撥款額度（可為 0 或自訂金額如 5000）。 |
| **`startDate`** | `TEXT` | **NOT NULL** | `string` | 撥款 / 專案起始日期 (`YYYY-MM-DD`) | 專案管考週期起點。 | 格式為 `YYYY-MM-DD`。 |
| **`status`** | `TEXT` | **NOT NULL** | `'active' \| 'settled'` | 子帳狀態：<br>• `active`: 進行中<br>• `settled`: 已結算完畢 | 1. 區分當前仍在進行中的採買帳，與已封存之歷史帳。<br>2. 結算後鎖定不允許任意改動。 | 抓取現役子帳：`WHERE status = 'active'`。 |
| **`note`** | `TEXT` | NULL | `string \| undefined` | 專款用途說明與備註 | 記錄每週一預撥、週五報銷原則等專款約定。 | 說明備註。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 子帳開戶時間戳 (毫秒) | 排序與時間記錄。 | 排序使用。 |
| **`settledAt`** | `INTEGER` | NULL | `number \| undefined` | 執行完畢結算時間戳 (毫秒) | 標記何時完成核銷並關閉子帳。 | 未結算時為 NULL。 |
| **`settlementNote`** | `TEXT` | NULL | `string \| undefined` | 結算備註說明 (如「實支4820，繳回180現金」) | 記錄結算時現金繳回或差額說明。 | 稽核核銷紀錄。 |
| **`items`** | `TEXT` | **NOT NULL** | `string` (JSON 字串) | 該子帳專屬的每筆採買明細項陣列 | **子帳內部採買明細清單**（見下方解析），包含發票號碼、金額、收據類型等。 | 儲存為 JSON 格式，可完整解析出各項採買單據。 |

#### 附：`sub_accounts.items` 內部明細物件結構解析 (JSON Array)
每個 `items` 欄位解析後為物件陣列，各物件所屬欄位如下：
- `id`: 明細唯一代碼 (`string`)
- `date`: 採買日期 (`string`, `YYYY-MM-DD`)
- `type`: `'expense'` (採買支出) 或 `'income'` (追加撥款)
- `categoryId`: 分類 ID (`string`)
- `categoryName`: 分類名稱 (`string`)
- `subItem`: 店家/採購品項 (`string`)
- `amount`: 金額 (`number`)
- `receiptType`: 憑證類型 (`'receipt' | 'invoice' | 'none'`)
- `invoiceNumber`: 發票號碼 (`string`, 選填)
- `claimant`: 經手人 (`string`, 選填)
- `note`: 備註說明 (`string`, 選填)
- `createdAt`: 建立時間戳 (`number`)
- `isImportedToGeneral`: 是否已整批匯入零用金總帳 (`boolean`)

---

## 八、資料表 6：`director_withdrawals`（廠長/主管專用提領紀錄）

### 1. 資料表簡介
廠長或一級主管因廠務應急需求，常向零用金經管人員直接領取大額現金備用。本表專門獨立記錄提款時間與金額，供後續借支沖銷或主管簽核對帳使用。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 提領唯一識別碼 (如 `dw_1726000000`) | 唯一標識該次提款紀錄。 | 唯一鍵值。 |
| **`date`** | `TEXT` | **NOT NULL** | `string` | 提領日期 (`YYYY-MM-DD`) | 提款時間記錄、月度主管提款走勢圖。 | 格式為 `YYYY-MM-DD`。 |
| **`amount`** | `REAL` | **NOT NULL** | `number` | 提領金額 (NT$) | 累計提領總額、單筆提款金額。 | 數值（例：`10000`）。 |
| **`note`** | `TEXT` | NULL | `string \| undefined` | 提款事由備註 (如「廠務修繕預備金」) | 標記主管領款之用途或歸墊約定。 | 備註字串。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 建立時間戳 (毫秒) | 建立時間排序。 | 毫秒時間戳。 |

---

## 九、現成資料直接撈取指南（免重複設欄位之關鍵設計）

未來若有新功能需求，請優先確認以下對應，**切勿重複增設冗餘欄位**：

| 新功能或業務需求 | 該去哪裡直接撈取資料？ | 欄位使用說明 |
| :--- | :--- | :--- |
| **1. 想要發票號碼清單做營業稅扣抵 / 查核** | `transactions.invoiceNumber` 與 `receiptType` | 直接下 `WHERE receiptType = 'invoice' AND invoiceNumber IS NOT NULL` 即可產出標準統一發票報銷清冊。 |
| **2. 想要列印紙本黏存單或產生傳票編號** | `transactions.voucherNo` 或 `rawVoucherId` | 系統已自帶高可讀性傳票號碼（如 `P2026090714-0001`）與帳務小管家標準號碼，免另建傳票序號產生器。 |
| **3. 想要統計各同仁（員工）請領金額排行** | `transactions.claimant` | 直接 `GROUP BY claimant` 就能完成員工請領開支排行榜，支援主管審閱與防弊查核。 |
| **4. 想要歷史分類開銷統計（即使用戶之後改了分類名稱）** | `transactions.categoryName` | 內建靜態快照，無需與 `categories` 表進行複雜的 JOIN，查詢極度快速且歷史資料永不失真。 |
| **5. 想要分析招待便當、聚餐之每人均價** | `transactions.peopleCount` 與 `amount` | 計算 `amount / peopleCount` 即可得出每人平均餐費，直接支援便當價格趨勢分析。 |
| **6. 想要追查這筆帳是哪一個採買專案結算匯入的** | `transactions.subAccountSourceId` 與 `subAccountSourceName` | 欄位已記錄來源子帳 ID 與名稱，一眼看出關聯，可直接反查 `sub_accounts`。 |
| **7. 想要計算目前零用金即時剩餘水位** | `transactions.type` 與 `amount` | 計算公式：`SUM(CASE WHEN type='income' THEN amount ELSE -amount END)`，即為當前手頭剩餘零用金現金額度。 |
| **8. 想要監控當月是否超支或該叫主管撥補** | `budgets.budgetAmount` 與 `alertThresholdPercent` | 直接比對當月支出總和與預算金額，低於閾值即發送預警。 |

---

## 十、常用 SQL 快速查詢範例（隨查隨用）

未來程式或腳本可直接複製以下 SQL 語句提取所需資料：

### 1. 查詢零用金當前最新手頭現金總結餘 (Current Balance)
```sql
SELECT 
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS current_petty_cash_balance
FROM transactions;
```

### 2. 查詢指定月份 (例如 2026年09月) 總收入、總支出與淨現金流
```sql
SELECT 
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS net_cash_flow
FROM transactions
WHERE date LIKE '2026-09%';
```

### 3. 查詢指定月份各支出分類金額與佔比排行
```sql
SELECT 
  categoryName,
  COUNT(*) AS transaction_count,
  SUM(amount) AS total_amount,
  ROUND(SUM(amount) * 100.0 / (SELECT SUM(amount) FROM transactions WHERE date LIKE '2026-09%' AND type = 'expense'), 2) AS percentage
FROM transactions
WHERE date LIKE '2026-09%' AND type = 'expense'
GROUP BY categoryName
ORDER BY total_amount DESC;
```

### 4. 查詢所有已開立統一發票之支出明細清冊 (供稅務申報)
```sql
SELECT 
  date,
  voucherNo,
  invoiceNumber,
  claimant,
  categoryName,
  subItem,
  amount,
  note
FROM transactions
WHERE receiptType = 'invoice' AND invoiceNumber IS NOT NULL AND invoiceNumber != ''
ORDER BY date DESC;
```

### 5. 查詢各同仁 (經辦請領人) 累計請領金額排行
```sql
SELECT 
  COALESCE(claimant, '未指定請領人') AS claimant_name,
  COUNT(*) AS claim_count,
  SUM(amount) AS total_claimed_amount
FROM transactions
WHERE type = 'expense'
GROUP BY claimant
ORDER BY total_claimed_amount DESC;
```

### 6. 查詢指定月份預算使用進度與超支評估
```sql
SELECT 
  b.yearMonth,
  b.budgetAmount AS monthly_budget,
  COALESCE(e.total_spent, 0) AS total_spent,
  (b.budgetAmount - COALESCE(e.total_spent, 0)) AS remaining_budget,
  ROUND((COALESCE(e.total_spent, 0) * 100.0 / b.budgetAmount), 1) AS budget_usage_percent,
  b.alertThresholdPercent AS alert_threshold
FROM budgets b
LEFT JOIN (
  SELECT SUBSTR(date, 1, 7) AS ym, SUM(amount) AS total_spent
  FROM transactions
  WHERE type = 'expense'
  GROUP BY SUBSTR(date, 1, 7)
) e ON b.yearMonth = e.ym
WHERE b.yearMonth = '2026-09';
```

---

## 結語與維護紀錄
- **版本**：v2.0 (SQLite 實體資料庫規格)
- **維護者**：公司零用金系統工程組
- **更新日期**：2026-09-21
- **異動規範**：如未來確有不可替代之新業務需求需增修欄位，請同步更新本檔案與 `/server/db.ts` 中的 `initSchema`，以確保全系統文件與程式一致。
