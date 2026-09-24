# 公司零用金與 ERP 財務管理系統 — 資料庫綱要與欄位字典 (DATABASE_SCHEMA.md)

本文件完整收錄「企業零用金、客戶廠商名冊與財務管理系統」後端 SQLite 實體資料庫的所有 11 個標準正規化核心資料表、欄位定義、商業邏輯意義與程式使用指引。

> **💡 開發者重要指引：**  
> 未來若有任何新小程式、新報表模組、外接腳本（Python / C# / Excel VBA / BI 工具）或新增功能，**請優先查閱本表**。現有資料庫結構已具備 100% SQL 實體正規化、多公司關係企業、財務傳票號碼、統一發票號碼、稅額分離（未稅/營業稅5%）、可扣抵性、客戶廠商雙重身分、多聯絡人實體表、交際禮金實體表、歷史靜態快照、專案子帳明細實體表等豐富維度，**可直接下 SQL JOIN 撈取現成數據，毋需額外重複建立資料表或欄位**。

---

## 核心設計理念與業務規則確認 (Design Philosophy)

本系統經實務討論後確立以下四大核心架構原則：

1. **核心資料庫 100% SQL 正規化 (SQL-First Architecture)**
   - 資料庫核心全採用標準 SQL 實體資料表（包含 `customer_contacts`, `customer_events`, `sub_account_items` 等關聯表），每一筆資料皆有獨立實體資料列與外部索引，支援標準 SQL 關聯聚合與 `JOIN` 查詢。
   - **JSON 匯入匯出純粹為「附加選項 / 額外功能」**：旨在提供操作者方便在外部（如 VS Code、Excel、純文字編輯器）檢視、批次修改或備份資料，系統存取與執行一律以正規化 SQL 資料表為準。
2. **零用金大水池不分公司（報稅發票歸屬原則）**
   - 實體零用金為三間關係企業共用之實體「大水池」，資金統一由實質負責人出資提供，因此**沒有各公司獨立預算或各自水池的問題**。
   - 支出憑證歸屬純粹為報稅問題：
     - 若支出取得**有打統編的發票**，則歸檔於該統編所屬特定公司以供申報扣抵營業稅；
     - 若為**免用發票收據**且未特別註明哪間公司，則列入共用大水池；
     - 若**無單據**則作為一般內部帳務紀錄。
3. **經辦同仁/請領人識別與未來擴充**
   - 目前經辦同仁與請領人採用「姓名」作為主鍵與快速選單，兼具直覺性與易用性。未來若導入獨立人事/員工管理系統，可無縫升級增設員工編號 (`employeeId`)。
4. **營業稅分離與 ±1 元手動微調彈性**
   - 自動以 5% 計算未稅銷售額 (`netAmount`) 與營業稅額 (`taxAmount`)，並允許會計人員手動微調 ±1 元差額，以完美相容各加油站、大賣場開立發票時的四捨五入尾數差異。

---

## 目錄
1. [資料庫基本技術規格](#一資料庫基本技術規格)
2. [資料庫整體關聯與架構總覽 (11 大實體表)](#二資料庫整體關聯與架構總覽-11-大實體表)
3. [資料表 1：`company_profile`（公司基本設定主檔與多行號管理）](#三資料表-1company_profile公司基本設定主檔與多行號管理)
4. [資料表 2：`customers`（客戶與協力廠商主檔名冊）](#四資料表-2customers客戶與協力廠商主檔名冊)
5. [資料表 3：`customer_contacts`（客戶與廠商聯絡人明細表 - 正規化實體表）](#五資料表-3customer_contacts客戶與廠商聯絡人明細表---正規化實體表)
6. [資料表 4：`customer_events`（客戶與廠商交際禮金與重要事件表 - 正規化實體表）](#六資料表-4customer_events客戶與廠商交際禮金與重要事件表---正規化實體表)
7. [資料表 5：`transactions`（零用金核心收支流水帳）](#七資料表-5transactions零用金核心收支流水帳)
8. [資料表 6：`categories`（多階層分類與自訂選單）](#八資料表-6categories多階層分類與自訂選單)
9. [資料表 7：`claimants`（經辦同仁與請領人名冊）](#九資料表-7claimants經辦同仁與請領人名冊)
10. [資料表 8：`budgets`（月份預算與安全水位設定）](#十資料表-8budgets月份預算與安全水位設定)
11. [資料表 9：`sub_accounts`（專案採買專款子帳戶主檔）](#十一資料表-9sub_accounts專案採買專款子帳戶主檔)
12. [資料表 10：`sub_account_items`（專案採買專款子帳明細表 - 正規化實體表）](#十二資料表-10sub_account_items專案採買專款子帳明細表---正規化實體表)
13. [資料表 11：`director_withdrawals`（廠長/主管專用提領紀錄）](#十三資料表-11director_withdrawals廠長主管專用提領紀錄)
14. [現成資料直接撈取指南（免重複設欄位之關鍵設計）](#十四現成資料直接撈取指南免重複設欄位之關鍵設計)
15. [常用 SQL 快速查詢範例（隨查隨用，含 JOIN 關聯）](#十五常用-sql-快速查詢範例隨查隨用含-join-關聯)
16. [資料庫模組化抽離備份與接力協同開發架構](#十六資料庫模組化抽離備份與接力協同開發架構)

---

## 一、資料庫基本技術規格

| 規格項目 | 內容說明 |
| :--- | :--- |
| **檔案路徑** | `/data/petty_cash.sqlite`（專案根目錄下 `data/` 資料夾） |
| **資料庫引擎** | **SQLite 3**（支援標準 SQL 語法、ACID 事務保證、B-Tree 索引） |
| **文字編碼** | **UTF-8**（支援繁體中文、特殊字符、Emoji） |
| **正規化等級** | **完全關聯實體表（3NF）**（聯絡人、交際事件、子帳明細皆為獨立實體資料表） |
| **連線相容性** | 支援標準 `sqlite3` 命令列工具、`DB Browser for SQLite`、Python `sqlite3`、Node.js `better-sqlite3` / `sql.js`、DBeaver、Excel ODBC 等 |
| **備份與攜帶** | 單一檔案封裝，隨時可複製該檔案帶走或置入隨身碟換機運作；支援單模組獨立抽離、全資料表 SQL Dump (`.sql`) 與 AES-256 加密 |
| **全端 API 介面** | 透過 `server.ts` 提供 RESTful API (`/api/transactions`, `/api/customers`, `/api/customer-events`, `/api/sub-account-items` 等) |

---

## 二、資料庫整體關聯與架構總覽 (11 大實體表)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   petty_cash.sqlite                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
          │
          ├─► [company_profile]        公司行號主檔（多關係企業、統編、帳戶、抬頭）
          │         │
          │         ├── (1:N 歸屬) ───► transactions.companyId
          │         └── (1:N 常用) ───► customers.favoriteCompanyIds
          │
          ├─► [customers]              客戶與廠商主檔（雙重身分、付款條件、銀行帳戶）
          │         │
          │         ├── (1:N 關聯) ───► [customer_contacts] 客戶/廠商主要與次要聯絡人名單
          │         │                          (customerId ──► customers.id)
          │         │
          │         └── (1:N 關聯) ───► [customer_events]   客戶婚喪喜慶、交際禮金與大事紀
          │                                    (customerId ──► customers.id)
          │                                    (linkedTransactionId ──► transactions.id)
          │
          ├─► [transactions]           核心收支流水帳（發票、傳票、未稅/稅額5%、扣抵）
          │         ▲
          │         └── (明細匯入) ───► 由 sub_account_items 採買明細批次核銷匯入
          │
          ├─► [categories]             主分類、階層細項選單、視覺色碼與稅務扣抵屬性
          │
          ├─► [claimants]              常用經辦同仁/請領人快速選單名冊
          │
          ├─► [budgets]                月份預算額度與警戒百分比設定
          │
          ├─► [sub_accounts]           專案採買備用金子帳（小明午餐、工地現場採買）
          │         │
          │         └── (1:N 關聯) ───► [sub_account_items] 子帳每日採買明細、發票收據項目
          │                                    (subAccountId ──► sub_accounts.id)
          │
          └─► [director_withdrawals]   主管/廠長專用大額提款備用金核對表
```

---

## 三、資料表 1：`company_profile`（公司基本設定主檔與多行號管理）

### 1. 資料表簡介
作為全系統最高層級的「公司行號主檔」，支援管理多家關係企業（如田頭工程、關係營造等），儲存公司全稱、簡稱、統一編號、法定負責人、登記營運地址、代表電話、傳真、官方網站、銀行帳戶資訊、會計出納簽核人、表單列印抬頭以及視覺色標。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 公司主檔識別碼 | 關係企業唯一 ID，如 `comp_1`, `comp_2`, `comp_3`。 | 用於 `transactions.companyId` 與外鍵篩選。 |
| **`name`** | `TEXT` | **NOT NULL** | `string` | 公司正式全名 | 頂部導覽列抬頭、所有 A4 報表正上方表頭、外部正式請款單據。 | 例如：「田頭工程有限公司」。 |
| **`shortName`** | `TEXT` | NULL | `string` | 公司簡稱 | 側邊欄折疊縮寫、報表標籤、名牌與簡報。 | 例如：「田頭工程」。 |
| **`taxId`** | `TEXT` | NULL | `string` | 統一編號 (8碼統編) | 發票開立對照、扣抵憑單、銀行表單、採購單。 | 例如：`13044353`。 |
| **`representative`** | `TEXT` | NULL | `string` | 公司法定負責人/代表人 | 合約書、正式公文、最高層級簽章處。 | 例如：「李永勝」。 |
| **`phone`** | `TEXT` | NULL | `string` | 公司代表號電話 | 報表聯絡資料、外部訂單表頭聯絡窗口。 | 例如：`02-2345-6789`。 |
| **`fax`** | `TEXT` | NULL | `string` | 傳真號碼 | 傳真採購確認單、詢價單頁尾。 | 例如：`02-2345-6790`。 |
| **`email`** | `TEXT` | NULL | `string` | 聯絡或財務專用 Email | 電子發票寄發、對帳聯絡信箱。 | 例如：`finance@example.com`。 |
| **`website`** | `TEXT` | NULL | `string` | 公司官方網站網址 | 企業對外官網資訊。 | 例如：`https://example.com`。 |
| **`postalCode`** | `TEXT` | NULL | `string` | 郵遞區號 (3或5碼) | 發票與公文郵寄區號。 | 例如：`221`。 |
| **`address`** | `TEXT` | NULL | `string` | 公司登記/營運地址 | 請款單寄送地址、送貨單發票發貨處。 | 例如：「新北市汐止區新台五路一段100號」。 |
| **`bankName`** | `TEXT` | NULL | `string` | 往來銀行代碼與名稱 | 請款單據匯款指引、撥補轉帳。 | 例如：「臺灣銀行 (004)」。 |
| **`bankBranch`** | `TEXT` | NULL | `string` | 銀行分行名稱 | 匯款分行指定。 | 例如：「南港分行」。 |
| **`bankCode`** | `TEXT` | NULL | `string` | 銀行機構金融代號 | 跨行通匯 3 碼代號。 | 例如：`004`。 |
| **`bankAccount`** | `TEXT` | NULL | `string` | 公司銀行匯款帳號 | 銀行對帳、廠商付款指定受款帳號。 | 例如：`004-012-3456789`。 |
| **`accountName`** | `TEXT` | NULL | `string` | 銀行帳戶戶名 | 匯款受款人比對，避免同仁或廠商匯錯戶名。 | 例如：「田頭工程有限公司」。 |
| **`chiefAccountant`**| `TEXT` | NULL | `string` | 主辦會計/財務主管姓名 | 各項正式傳票、零用金報表簽核預設審核人。 | 報表審核簽核欄自動帶出。 |
| **`cashier`** | `TEXT` | NULL | `string` | 出納專員姓名 | 現金收支明細表、撥補申請單出納簽核人。 | 報表審核簽核欄自動帶出。 |
| **`reportHeader`** | `TEXT` | NULL | `string` | 正式列印表頭主標題 | 自訂套表抬頭，為空時預設以「公司名稱 + 報表名稱」。 | 供各類報表自動套用。 |
| **`invoiceBuyerName`** | `TEXT` | NULL | `string` | 常用發票買受人名稱 | 開立發票時抬頭預設值。 | 例如：「田頭工程有限公司」。 |
| **`taxInvoiceNote`** | `TEXT` | NULL | `string` | 發票開立與報帳特別備註 | 顯示於報表下方或報帳指引，例如「報銷請開立三聯式發票，載明統編 13044353」。 | 報表底部提醒專用文字。 |
| **`color`** | `TEXT` | NULL | `string` | 行號專屬識別色標 | 前端多行號切換標籤與識別色彩十六進位碼。 | 例如：`#0066cc`, `#059669`。 |
| **`entityType`** | `TEXT` | 預設 `'corporate'` | `'corporate' \| 'individual'` | 組織主體性質 | `'corporate'`: 法人/公司/商行（有統編之正式公司）；`'individual'`: 個人/自然人/私人出資主體（無統編，僅負責人姓名，專供私人款項與未開發票工程收付）。 | 區分正式公司與個人私帳主體，控制外部表單呈現。 |
| **`isJointHeader`** | `INTEGER` | 預設 `1` | `boolean` (`0` \| `1`) | 是否參與對外三間公司聯名大抬頭 | `1`: 列入對外工程聯名報表抬頭（如三間公司正式名稱）；`0`: 個人私帳主體或獨立專用帳戶，對外表單自動排除，絕不突兀印出私人名字給客戶看。 | 解決客戶表單印出私人名字突兀問題。 |
| **`isConfidential`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否為機密/隱藏私帳主體 | `1`: 具機密隱藏屬性（僅具高階權限主管可見，遇外部查帳或一般同仁查閱時自動遮蔽屏蔽）；`0`: 一般公開公司主體。 | 內外帳查帳與隱私權限過濾。 |
| **`isDefault`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否為系統主要預設行號 | 登入或初始化時預設選取之公司。 | `1` 為預設主要公司。 |
| **`isNominalPettyCashHolder`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否為共用零用金之法定主理行號 | 多間關係企業共用同一零用金大水池時，標明實體款項依法記於哪家帳上。 | 零用金水池歸屬判斷。 |
| **`sortOrder`** | `INTEGER` | 預設 `0` | `number` | 公司排序權重 | 多行號下拉選單排列先後。 | `ORDER BY sortOrder ASC`。 |
| **`updatedAt`** | `INTEGER` | **NOT NULL** | `number` | 最後變更修改時間戳 (毫秒) | 稽核紀錄、資料庫最新時間戳記。 | 毫秒數 Unix Timestamp。 |

---

### 3. 關聯附屬表：`company_bank_accounts`（公司與個人金融機構往來帳戶主檔）

公司或負責人名下可能擁有多組金融機構帳戶（主要營運戶、薪轉戶、零用金專戶、個人收款戶等）。此表支援公帳/私帳標記與機密隱藏屬性：

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 銀行帳戶唯一主鍵 | 例如：`comp_1_b_1`。 |
| **`companyId`** | `TEXT` | **NOT NULL (INDEX)**| `string` | 所屬公司或主體 ID | 外鍵，關聯 `company_profile.id`。 |
| **`bankName`** | `TEXT` | **NOT NULL** | `string` | 金融機構名稱 | 例如：「臺灣銀行」、「玉山銀行」。 |
| **`bankBranch`** | `TEXT` | NULL | `string` | 分行名稱 | 例如：「斗南分行」。 |
| **`bankCode`** | `TEXT` | NULL | `string` | 銀行總代碼 (3碼) | 跨行轉帳代碼，例如：`004`。 |
| **`branchCode`** | `TEXT` | NULL | `string` | 分行代碼 (4碼) | 選填。 |
| **`bankAccount`** | `TEXT` | **NOT NULL** | `string` | 銀行帳號 | 撥補扣款與收款指定帳號。 |
| **`accountName`** | `TEXT` | **NOT NULL** | `string` | 帳戶戶名 | 公司名或負責人個人名字。 |
| **`accountType`** | `TEXT` | 預設 `'operating'`| `string` | 帳戶性質 | `'operating'` (營運收付戶)、`'payroll'` (薪轉)、`'petty_cash'` (零用金撥補)、`'savings'`、`'other'`。 |
| **`isDefault`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否為預設主要扣款帳戶 | `1`: 主要預設帳戶，供系統自動選用扣款。 |
| **`isConfidential`**| `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否為私人機密帳戶 | `1`: 敏感機密帳戶，外帳查帳或一般權限同仁瀏覽時遮蔽。 |
| **`isPrivateAccount`**| `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否為私人名義帳戶 | `1`: 負責人個人名義私帳（非公司公帳戶頭，專供未開發票匯款入帳）；`0`: 公司正式公帳。 |
| **`note`** | `TEXT` | NULL | `string` | 備註用途說明 | 帳戶使用規範與說明。 |
| **`sortOrder`** | `INTEGER` | 預設 `0` | `number` | 排序權重 | 帳戶選單排列優先順序。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 建立時間戳 (毫秒) | 系統建檔時間。 |

---

### 4. 關聯附屬表：`company_phones`（公司多筆電話與傳真通訊表）

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 通訊項目主鍵 | 例如：`comp_1_p_1`。 |
| **`companyId`** | `TEXT` | **NOT NULL (INDEX)**| `string` | 所屬公司或主體 ID | 外鍵，關聯 `company_profile.id`。 |
| **`type`** | `TEXT` | **NOT NULL** | `'phone' \| 'fax' \| 'mobile' \| 'other'` | 通訊類型 | 電話、傳真、行動電話或其他。 |
| **`number`** | `TEXT` | **NOT NULL** | `string` | 電話/傳真號碼 | 例如：`05-597-1234`。 |
| **`label`** | `TEXT` | NULL | `string` | 識別標籤 | 例如：「公司代表號」、「工務專線」、「傳真專線」。 |
| **`isDefault`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否為該類型預設號碼 | `1`: 該類型預設號碼，列印時優先帶出。 |
| **`sortOrder`** | `INTEGER` | 預設 `0` | `number` | 排序權重 | 排序先後。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 建立時間戳 (毫秒) | 系統建檔時間。 |

---

## 四、資料表 2：`customers`（客戶與協力廠商主檔名冊）

### 1. 資料表簡介
儲存全集團所有業務往來的「客戶」與「協力廠商」統一通訊名冊主檔。具備「**雙重身分支援**」（可兼具客戶與廠商角色）、個人與企業法人區分、收款條件、銀行匯款帳戶、跨公司常用標記等。其附屬的多聯絡人與交際歷程已完全分離正規化至 `customer_contacts` 與 `customer_events` 表。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 客戶/廠商唯一代碼 (如 `cust_1726000000`) | 唯一鍵值，各業務模組引用客戶之主鍵。 | 查詢指定客戶：`WHERE id = 'cust_...'`。 |
| **`name`** | `TEXT` | **NOT NULL** | `string` | 客戶/廠商正式全名 或 個人姓名 | 搜尋、聯絡簿清單、請款抬頭、報表顯示。 | 例如：「台灣塑膠工業股份有限公司」、「林志榮」。 |
| **`shortName`** | `TEXT` | NULL | `string` | 公司或個人簡稱 | 快速標籤、行事曆大事記顯示。 | 例如：「台塑」、「志榮工程」。 |
| **`isIndividual`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否為個人身分 (非公司法人) | `1`: 個人客戶/自然人；`0`: 公司行號/法人機構。個人身分時統編可免填。 | 篩選自然人或公司法人。 |
| **`customerCategory`** | `TEXT` | NULL | `string` | 客戶類別屬性 | '個人客戶'、'店家 / 門市行號'、'公司企業法人'、'政府機關 / 學校公營' 等。 | 業務客戶客群分類。 |
| **`supplierCategory`** | `TEXT` | NULL | `string` | 合作廠商業務所屬分類 | '瀝青砂石 / 建材原料'、'工程發包 / 現場工班'、'機具車輛 / 租賃保養'、'五金材料 / 水電設備' 等。 | 廠商專業領域篩選與發包歸類。 |
| **`taxId`** | `TEXT` | NULL | `string` | 統一編號 (8碼統編) | 發票開立對照、工商登記比對。個人客戶則可留空。 | 例如：`03757848`。 |
| **`representative`** | `TEXT` | NULL | `string` | 負責人 / 代表人姓名 | 董事長、負責人或商行負責人。 | 例如：「王文淵」。 |
| **`representativeMobile`** | `TEXT` | NULL | `string` | 負責人個人手機號碼 | 緊急聯絡、高層聯繫電話。 | 例如：`0912-345-678`。 |
| **`secondaryRepresentative`** | `TEXT` | NULL | `string` | 副負責人 / 現場主管姓名 | 工地主任、廠長、現場第一線負責主管。 | 例如：「李主任」、「謝帝旺」。 |
| **`phone1`** | `TEXT` | NULL | `string` | 主要聯絡電話 (公司市話/代表號) | 客戶清單撥打電話、總機分機。 | 例如：`02-2712-2211`。 |
| **`phone2`** | `TEXT` | NULL | `string` | 備用電話 / 專線電話 | 廠區專線、採購室電話。 | 例如：`02-2712-2212`。 |
| **`fax`** | `TEXT` | NULL | `string` | 傳真號碼 | 傳真報價單、詢價單。 | 例如：`02-2712-2213`。 |
| **`email`** | `TEXT` | NULL | `string` | 電子信箱 | 報價發票寄送。 | 例如：`service@fpc.com.tw`。 |
| **`website`** | `TEXT` | NULL | `string` | 官方網站網址 | 企業官網連結。 | 官方網站 URL。 |
| **`lineId`** | `TEXT` | NULL | `string` | LINE 官方帳號 / 個人 ID | 工地群組、業務即時通訊。 | LINE ID。 |
| **`postalCode`** | `TEXT` | NULL | `string` | 郵遞區號 (3或5碼) | 請款單與發票郵寄。 | 例如：`105`。 |
| **`address`** | `TEXT` | NULL | `string` | 營業登記/公司通訊地址 | 帳單發票地址。 | 例如：「台北市松山區敦化北路201號」。 |
| **`shippingAddress`** | `TEXT` | NULL | `string` | 送貨地址 / 工地現場施工地址 | 吊卡貨運送達現場、施工出貨處。 | 例如：「雲林縣麥寮鄉台塑工業園區1號」。 |
| **`paymentTerm`** | `TEXT` | NULL | `string` | 主要收款條件 / 配合方式 | '匯款(月結30天)'、'現金/貨到付款'、'支票次月15號'、'完工驗收付款'。 | 請款對帳規範。 |
| **`bankName`** | `TEXT` | NULL | `string` | 配合往來銀行名稱 | 匯款發包支付、退款對帳。 | 例如：「808 玉山銀行」。 |
| **`bankBranch`** | `TEXT` | NULL | `string` | 銀行分行名稱 | 匯款分行。 | 例如：「敦南分行」。 |
| **`bankAccount`** | `TEXT` | NULL | `string` | 銀行匯款帳號 | 廠商撥款入帳帳號。 | 例如：`808-0123-456789`。 |
| **`accountName`** | `TEXT` | NULL | `string` | 銀行匯款戶名 | 受款人戶名核對。 | 例如：「台灣塑膠工業股份有限公司」。 |
| **`businessItems`** | `TEXT` | NULL | `string` | 主要營業項目 / 專長工項說明 | 記錄主要業務範圍（如瀝青鋪設、重機械租賃、電器五金）。 | 快速關鍵字檢索。 |
| **`isCustomer`** | `INTEGER` | 預設 `1` | `boolean` (`0` \| `1`) | 是否具備客戶身分 | `1`: 是客戶；可出現在客戶管理名單與請款對象中。 | 抓取所有客戶：`WHERE isCustomer = 1`。 |
| **`isSupplier`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否具備合作廠商身分 | `1`: 是廠商；可出現在廠商採購名單與外包通訊錄中。 | 抓取所有廠商：`WHERE isSupplier = 1`。 |
| **`favoriteCompanyIds`** | `TEXT` | **NOT NULL** | `string` (JSON 字串) | 標記為常用客戶的所屬公司 ID 陣列 | 跨公司名冊共用架構下，記錄哪些行號將此客戶設為常用。 | JSON 陣列如 `["comp_1", "comp_2"]`。 |
| **`contacts`** | `TEXT` | NULL | `string` | 相容唯讀快照 (JSON 字串) | 歷史與匯出相容欄位，主要正規化讀寫由 `customer_contacts` 負責。 | 請優先查閱 `customer_contacts` 表。 |
| **`events`** | `TEXT` | NULL | `string` | 相容唯讀快照 (JSON 字串) | 歷史與匯出相容欄位，主要正規化讀寫由 `customer_events` 負責。 | 請優先查閱 `customer_events` 表。 |
| **`note`** | `TEXT` | NULL | `string` | 客戶總體備註與合作配合事項 | 配合注意事項、計價特約說明。 | 補充文字。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 建檔時間戳 (毫秒) | 建立時間排序。 | 毫秒數。 |
| **`updatedAt`** | `INTEGER` | **NOT NULL** | `number` | 最後修改時間戳 (毫秒) | 資料版本稽核。 | 毫秒數。 |

---

## 五、資料表 3：`customer_contacts`（客戶與廠商聯絡人明細表 - 正規化實體表）

### 1. 資料表簡介
**【正規化獨立資料表】** 儲存各客戶或協力廠商旗下的所有主要與次要業務窗口、會計出納、工地主管等聯絡人資訊。支援依客戶外鍵 (`customerId`) 快速索引查詢與排序。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 聯絡人唯一代碼 | 聯絡人實體主鍵 (如 `contact_cust_1_0`)。 | 唯一鍵值。 |
| **`customerId`** | `TEXT` | **NOT NULL (INDEX)**| `string` | 所屬客戶/廠商唯一代碼 | **外鍵**，關聯 `customers.id`。 | `WHERE customerId = ?` |
| **`name`** | `TEXT` | **NOT NULL** | `string` | 聯絡人姓名 | 聯絡窗口名稱（如李金銘、林主任）。 | 聯絡人搜尋。 |
| **`title`** | `TEXT` | NULL | `string` | 職稱 / 部門 | 業務主任、工地主任、專案工程師、會計等。 | 職銜區分。 |
| **`mobile`** | `TEXT` | NULL | `string` | 行動電話手機號碼 | 常用公務手機。 | 例如：`0912-345-678`。 |
| **`phone`** | `TEXT` | NULL | `string` | 辦公室市話 / 分機號碼 | 分機電話。 | 例如：`02-2712-2211 #123`。 |
| **`email`** | `TEXT` | NULL | `string` | 電子郵件信箱 | 業務對接 Email。 | 例如：`ming@example.com`。 |
| **`lineId`** | `TEXT` | NULL | `string` | LINE 通訊軟體 ID | 即時通訊。 | LINE ID。 |
| **`note`** | `TEXT` | NULL | `string` | 備註說明 | 備註（如「主要聯絡窗口」、「李太太專線」）。 | 補充文字。 |
| **`sortOrder`** | `INTEGER` | 預設 `0` | `number` | 排序權重 | 該客戶聯絡人排列先後順序。 | `ORDER BY sortOrder ASC`。 |

---

## 六、資料表 4：`customer_events`（客戶與廠商交際禮金與重要事件表 - 正規化實體表）

### 1. 資料表簡介
**【正規化獨立資料表】** 專門記錄全公司與客戶或協力廠商之間的所有「婚喪喜慶（紅白包）、重大合約簽署、公關送禮、重要事項」歷史。支援金額與禮金方向、出席代表、憑證備註，並可直接透過 `linkedTransactionId` 反向關聯至零用金傳票進行核銷對帳。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 事件紀錄唯一代碼 | 事件主鍵 (如 `ev_1726000000_abc`)。 | 唯一鍵值。 |
| **`customerId`** | `TEXT` | **NOT NULL (INDEX)**| `string` | 所屬客戶/廠商唯一代碼 | **外鍵**，關聯 `customers.id`。 | `WHERE customerId = ?` |
| **`date`** | `TEXT` | **NOT NULL** | `string` | 發生日期 (`YYYY-MM-DD`) | 禮金送出或收受日期、合約簽署日期。 | 依日期排序檢索。 |
| **`category`** | `TEXT` | **NOT NULL** | `string` | 大分類代碼 | `'wedding_funeral'` (婚喪喜慶) \| `'business_courtesy'` (商務交際) \| `'important_matter'` (重要事項) \| `'other'`。 | 大類統計。 |
| **`categoryLabel`** | `TEXT` | NULL | `string` | 分類中文標籤 | 畫面顯示文字（如「婚喪喜慶」、「商務交際」）。 | 標籤展示。 |
| **`title`** | `TEXT` | **NOT NULL** | `string` | 事由標題 | 例如：「陳董令嬡喜宴紅包」、「新廠落成花籃」、「年度維護合約簽署」。 | 事件摘要。 |
| **`eventType`** | `TEXT` | NULL | `string` | 細分項目標籤 | 例如：結婚紅包、公祭白包、花籃盆栽、中秋禮盒、合約簽署。 | 細項分析。 |
| **`hasAmount`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否涉及金額往來 | `1`: 具禮金金錢支出/收入；`0`: 純文字備註事項。 | 篩選金錢往來。 |
| **`amount`** | `REAL` | 預設 `0` | `number` | 禮金 / 金額 (NT$) | 實付或收受禮金金額。 | 禮金統計加總。 |
| **`direction`** | `TEXT` | 預設 `'outgoing'` | `'outgoing' \| 'incoming'` | 往來方向 | `'outgoing'`: 我方送出禮金；`'incoming'`: 對方送入/回禮。 | 計算送出與收到。 |
| **`targetPerson`** | `TEXT` | NULL | `string` | 對象 / 收受人 | 例如：陳董事長、林總監、李副總。 | 查核交際對象。 |
| **`ourRepresentative`**| `TEXT` | NULL | `string` | 我方出席代表 / 經手人 | 例如：廠長、李業務主任、總經理。 | 經手同仁。 |
| **`isPettyCashLinked`**| `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否由公司零用金核銷報帳 | `1`: 已透過零用金開立傳票核銷；`0`: 尚未核銷或個人自理。 | 勾稽零用金報銷。 |
| **`voucherNo`** | `TEXT` | NULL | `string` | 零用金傳票號碼 | 核銷之零用金傳票編號（如 `P2026090714-0001`）。 | 傳票號碼對照。 |
| **`linkedTransactionId`**| `TEXT` | NULL (INDEX) | `string` | 關聯之零用金流水帳 ID | **外鍵**，精確反向關聯至 `transactions.id`。 | `JOIN transactions t ON e.linkedTransactionId = t.id` |
| **`companyId`** | `TEXT` | NULL | `string` | 出款公司代碼 | 關聯 `company_profile.id`。 | 多公司出款歸屬。 |
| **`proofNote`** | `TEXT` | NULL | `string` | 憑證與附件存查說明 | 例如：謝卡已收、喜帖存查、已附訃聞、已附合約副本。 | 審核查核依據。 |
| **`note`** | `TEXT` | NULL | `string` | 補充備註與細節 | 詳細經過與交辦事項。 | 備註字串。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 建立時間戳 (毫秒) | 毫秒時間戳。 | 排序使用。 |

---

## 七、資料表 5：`transactions`（零用金核心收支流水帳）

### 1. 資料表簡介
記錄公司零用金的所有歷史流水帳（包含各項支出報銷，以及零用金歸墊撥補）。每一筆紀錄皆具備**歷史快照（Snapshot）**特性，即使日後分類名稱更名，亦不影響歷史帳目。同時支援未稅金額、營業稅額分離（5% 稅率計算與手動微調）與扣抵標記，並歸屬於指定公司行號。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 唯一交易代碼 (UUID / 時間戳 ID) | 主鍵識別碼，前後端資料同步、修改與刪除指定目標依據。 | 用於唯一鍵關聯或精確更新。例如 `tx_1726000000_abc`。 |
| **`date`** | `TEXT` | **NOT NULL** | `string` | 交易發生日期 (`YYYY-MM-DD`) | 1. 記帳列表依日期排序。<br>2. 月份收支統計、年報篩選。<br>3. 日期區間報表與 Excel 匯出。 | 格式為標準 ISO `2026-09-20`，可直接下 `LIKE '2026-09%'` 篩選整月。 |
| **`type`** | `TEXT` | **NOT NULL** | `'expense' \| 'income'` | 交易收支方向<br>• `expense`: 支出報銷<br>• `income`: 撥補/收入 | 1. 計算餘額：結餘 = SUM(income) - SUM(expense)。<br>2. UI 紅綠辨識。<br>3. 儀表板收支卡片統計。 | 直接依此欄位分群計算現金流入與流出。 |
| **`categoryId`** | `TEXT` | **NOT NULL** | `string` | 主分類識別碼 (如 `dining`, `fuel`, `courtesy`) | 關聯分類設定、圖表分析聚合分組。 | 供系統內部識別與快速統計分組使用。 |
| **`categoryName`** | `TEXT` | **NOT NULL** | `string` | 交易時主分類名稱快照 (如「餐飲開銷」、「交際禮金」) | **靜態快照**：記帳當下的分類名稱。日後分類更名，歷史紀錄依然完整無損。 | 匯出報表、Excel 試算表時直接讀取，**完全不用 JOIN `categories` 表**。 |
| **`subItem`** | `TEXT` | **NOT NULL** | `string` | 次級細項 / 店家 / 加油站 / 說明快照 | 記錄店家名（如八方雲集、台灣中油）、預支同仁、項目說明。 | 細項統計與搜尋時直接 `LIKE '%中油%'`。 |
| **`claimant`** | `TEXT` | NULL | `string` | 零用金經辦請領人姓名 (如「王大明 (總務)」) | 1. 查核是「誰」拿憑證來領款。<br>2. 人員請款分析排行榜、防弊稽核。<br>3. 請領人篩選器。 | 可直接 `GROUP BY claimant` 統計同仁每月報銷總額。未來擴充時可對應員工編號。 |
| **`peopleCount`** | `INTEGER` | NULL | `number` | 用餐開銷之參與人數 | 專用於「餐飲」類開銷。換算每人平均餐費 ($/人)。非餐飲類為 NULL。 | 分析便當均價或招待開銷時使用。 |
| **`amount`** | `REAL` | **NOT NULL** | `number` | 交易實付金額 (含稅總額，NT$) | 核心金額運算、總額加總、圖表長條圖、比例計算。 | 必須大於 0。 |
| **`note`** | `TEXT` | NULL | `string` | 補充備註與事由說明 | 填寫公務事由、出差目的、核銷備註。支援全文字串搜尋。 | 程式搜尋引擎比對目標。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 系統建檔 Unix 時間戳 (毫秒) | 1. 同日多筆帳目之先後次序排序。<br>2. 稽核建檔時間與登帳歷程。 | 毫秒數，排序使用。 |
| **`receiptType`** | `TEXT` | NULL | `'receipt' \| 'invoice' \| 'none'` | 單據憑證類型：<br>• `receipt`: 收據/免用發票<br>• `invoice`: 統一發票<br>• `none`: 無憑證/內部簽單 | 1. 會計稽核憑證齊全率統計。<br>2. 區分可扣抵稅額與一般收據。<br>3. 報表憑證勾稽篩選。 | 直接撈取即可知道該筆是否有發票或收據。 |
| **`invoiceNumber`** | `TEXT` | NULL | `string` | 統一發票號碼 (如 `AB-12345678`) | 當 `receiptType` 為 `invoice` 時記錄之發票號碼。供查帳與營業稅申報核對。 | 直接用 `WHERE invoiceNumber IS NOT NULL` 即撈出發票清冊。 |
| **`voucherNo`** | `TEXT` | NULL | `string` | 系統高可讀性傳票號碼 (如 `P2026090714-0001`) | **月份獨立傳票序號**：含年月時段前綴 + 當月 4 碼連號流水號。列印傳票單據專用。 | 會計報表與傳票封面直接引用本欄。 |
| **`rawVoucherId`** | `TEXT` | NULL | `string` | 帳務小管家原生傳票號碼 (如 `P20260907142530123`) | **外部相容傳票號碼**：以 `P + YYYYMMDDHHmmss + 毫秒` 編碼，與桌面財務軟體相容。 | 匯入匯出外部會計軟體時作為無縫對接鍵。 |
| **`subAccountSourceId`** | `TEXT` | NULL | `string` | 來源專款採買子帳戶 ID | 若該筆帳是由採買子帳戶匯入總帳，記錄其來源子帳 ID。手動記帳則為 NULL。 | 追溯該筆帳是哪一個專案結算過來的。 |
| **`subAccountSourceName`** | `TEXT` | NULL | `string` | 來源專款採買子帳戶名稱 | 同步儲存子帳名稱快照（如「每週午餐採買 (小明)」）。 | 報表顯示時一目了然，不用二次查詢 sub_accounts。 |
| **`companyId`** | `TEXT` | 預設 `'comp_1'` | `string` | 所屬關係企業公司 ID | 記錄此筆收支開銷歸屬於哪一家公司（如有統編發票申報歸屬）。 | 多公司切換、獨立報表與公司損益分攤篩選。 |
| **`netAmount`** | `REAL` | NULL | `number` | 銷售額 / 未稅金額 (NT$) | 扣除 5% 營業稅後之淨額。若為發票則為 `ROUND(amount / 1.05)`，收據則等於 `amount`。 | 會計科目未稅入帳與 401 申報直接取用。 |
| **`taxAmount`** | `REAL` | NULL | `number` | 營業稅額 (NT$) | 5% 進項營業稅額。支援手動微調 ±1 元差額。 | 營業稅可扣抵稅額統計。 |
| **`taxDeductible`** | `INTEGER` | 預設 `1` | `boolean` (`0` \| `1`) | 是否得扣抵 401 營業稅 | `1`: 得扣抵進項稅額；`0`: 依稅法不得扣抵（如交際應酬、非公務支出）或免稅。 | 國稅局扣抵清冊產出關鍵標記。 |
| **`sellerTaxId`** | `TEXT` | NULL | `string` | 開立發票廠商/店家統一編號 | 開立發票店家的 8 碼統編（如中油統編 `03757848`）。 | 未來 401 媒體申報檔直接產出。 |
| **`accountingCategory`** | `TEXT` | 預設 `'official_tax'` | `'official_tax' \| 'internal_management'` | 內外帳屬性隔離標籤 | `'official_tax'`: 正式公帳/稅務外帳（具合法進項/銷項憑證，供報稅申報）；`'internal_management'`: 內部管理私帳（未開發票工程款、私帳收支、私人戶撥款）。 | 查帳防護核心：外部查帳時 `WHERE accountingCategory = 'official_tax'` 完美隔離私帳。 |
| **`taxType`** | `TEXT` | 預設 `'taxable'` | `'taxable' \| 'tax_free' \| 'receipt_pool' \| 'unspecified'` | 課稅與憑證類別 | `'taxable'`: 應稅5%；`'tax_free'`: 免稅；`'receipt_pool'`: 收據大水池（免用發票收據合流）；`'unspecified'`: 未指定/無發票私帳收支。 | 稅務憑證清單與私帳分離統計。 |
| **`isConfidential`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 敏感收支機密隱藏標記 | `1`: 敏感機密款項（私人匯款、特定工程款），外部查帳模式或一般權限瀏覽時自動屏蔽隱藏；`0`: 公開常規收支。 | 權限控管與安全查帳過濾。 |

---

## 八、資料表 6：`categories`（多階層分類與自訂選單）

### 1. 資料表簡介
維護零用金系統之所有收支類別設定。採用靈活的多階層架構，每個主分類均包含其專屬的次級標籤名稱、預設細項清單、預設憑證類型與營業稅稅務扣抵屬性。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 分類代碼 (如 `dining`, `fuel`, `courtesy`) | 主鍵，與 `transactions.categoryId` 關聯。 | 唯一鍵值。 |
| **`name`** | `TEXT` | **NOT NULL** | `string` | 分類顯示名稱 (如「餐飲開銷」、「交際禮金」) | 前端下拉選單顯示名稱、分類管理清單。 | 分類顯示名稱。 |
| **`type`** | `TEXT` | **NOT NULL** | `'expense' \| 'income'` | 類別屬性（支出分類 或 撥補收入分類） | 前端記帳表單切換「支出」或「收入」時連動篩選。 | 抓取所有支出分類：`WHERE type = 'expense'`。 |
| **`icon`** | `TEXT` | NULL | `string` | Lucide 圖示名稱 (如 `utensils`, `fuel`, `gift`) | 前端 UI 渲染分類圖示視覺。 | 提供前端顯示合適之 Icon。 |
| **`color`** | `TEXT` | NULL | `string` | 分類主題顏色十六進位碼 (如 `#ea580c`) | 記帳按鈕底色、圓餅圖與長條圖配色、標籤顏色。 | 繪製圖表時直接取用此色碼。 |
| **`subLabel`** | `TEXT` | NULL | `string` | 次級項目之輸入引導標籤 (如「店家/餐飲名稱」) | 提示使用者在輸入細項時該填入什麼（如加油類提示「加油站名稱」）。 | 前端動態表單 Label 渲染。 |
| **`defaultSubItems`**| `TEXT` | **NOT NULL** | `string` (JSON 字串) | 預設細項快速選單陣列 (JSON 字串) | 記帳選中該分類時，自動帶出的常用點選按鈕清單（如八方雲集、中油直營等）。 | 儲存為 JSON 陣列字串，如 `["便當","飲料"]`。 |
| **`hasPeopleCount`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否啟用「人數」欄位輸入 | 判定選中此分類時，記帳介面是否需要顯示「開銷人數」輸入框。 | 餐飲類為 1，其餘為 0。 |
| **`defaultReceiptType`** | `TEXT` | NULL | `'receipt' \| 'invoice' \| 'none'` | 預設單據憑證類型 | 選取該分類時，表單預設自動選取的憑證類型（例如加油預設為 `invoice`）。 | 加速記帳流程。 |
| **`taxCategory`** | `TEXT` | NULL | `'deductible' \| 'non_deductible' \| 'tax_exempt'` | 營業稅預設屬性 | 'deductible' (可扣抵5%)、'non_deductible' (交際/不得扣抵)、'tax_exempt' (收據/免稅)。 | 自動連動 `transactions.taxDeductible`。 |
| **`sortOrder`** | `INTEGER` | 預設 `0` | `number` | 顯示排列順序權重 | 分類在前端選單的左右/上下排列優先序。 | `ORDER BY sortOrder ASC`。 |

---

## 九、資料表 7：`claimants`（經辦同仁與請領人名冊）

### 1. 資料表簡介
記錄常態性向零用金請領款項的同仁、部門或主管清單。供記帳時一鍵快選，避免同仁名字打錯字導致後續統計失真。未來若建立完整員工管理系統，本表已預留對應欄位。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`name`** | `TEXT` | **PRIMARY KEY** | `string` | 請領人姓名/職稱 (如「王大明 (總務)」) | 1. 記帳時的請領人下拉選單項目。<br>2. 對應 `transactions.claimant` 欄位值。 | 人名本身即為主鍵，直接 `SELECT name FROM claimants ORDER BY sortOrder ASC`。 |
| **`sortOrder`** | `INTEGER` | 預設 `0` | `number` | 顯示排序權重 | 決定常用請領人在快速點選按鈕上的優先排列順序。 | 依常用頻率升冪排列。 |

---

## 十、資料表 8：`budgets`（月份預算與安全水位設定）

### 1. 資料表簡介
管理每月份的支出預算上限，以及零用金警戒水位門檻。系統以此為依據計算預算達成率、剩餘可用額度，並在水位過低時發出撥補警示。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`yearMonth`** | `TEXT` | **PRIMARY KEY** | `string` | 預算所屬年月 (`YYYY-MM`，如 `2026-09`) | 主鍵，標識該月份的專屬預算設定。 | 直接下 `WHERE yearMonth = '2026-09'` 撈取指定月之預算設定。 |
| **`budgetAmount`** | `REAL` | **NOT NULL** | `number` | 該月預算總額度上限 (NT$) | 1. 當月開銷進度條（已用金額 / 預算總額）。<br>2. 預算超支警示判斷。 | 數值（例：`30000`）。 |
| **`alertThresholdPercent`** | `REAL` | **NOT NULL** | `number` | 零用金安全水位警戒百分比 (如 `20` 代表 20%) | 當零用金剩餘水位低於此百分比時，系統頂部立即跳出撥補警示通知。 | 預設為 20。若要計算警戒金額門檻：`budgetAmount * (alertThresholdPercent / 100)`。 |

---

## 十一、資料表 9：`sub_accounts`（專案採買專款子帳戶主檔）

### 1. 資料表簡介
針對具備獨立預撥週轉金之特定人員或採買專案（例如：小明每週預領 5,000 元午餐採買金、工地現場採購備用金），獨立開設子帳戶主檔管考其經辦人、起訖日與結算狀態。其採買收支單據細項已完全正規化儲存於 `sub_account_items` 實體表。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 子帳戶代碼 (如 `sub_1726000000_123`) | 唯一代碼，供專款管考與匯入總帳時之來源溯源識別。 | 唯一主鍵。 |
| **`name`** | `TEXT` | **NOT NULL** | `string` | 子帳戶專案名稱 (如「每週午餐採買 (小明)」) | 列表抬頭、匯入總帳時之來源標籤顯示。 | 識別專案名。 |
| **`custodian`** | `TEXT` | **NOT NULL** | `string` | 專款保管/經辦同仁 (如「陳小明」) | 標明誰拿了這筆專款備用金，負保管與核銷責任。 | 負責人姓名。 |
| **`initialFund`** | `REAL` | **NOT NULL** | `number` | 預先撥發的備用金起點金額 (NT$) | 子帳餘額計算起點：可用餘額 = `initialFund - 累計支出 + 追加款`。 | 起始撥款額度。 |
| **`startDate`** | `TEXT` | **NOT NULL** | `string` | 撥款 / 專案起始日期 (`YYYY-MM-DD`) | 專案管考週期起點。 | 格式為 `YYYY-MM-DD`。 |
| **`status`** | `TEXT` | **NOT NULL** | `'active' \| 'settled'` | 子帳狀態：<br>• `active`: 進行中<br>• `settled`: 已結算完畢 | 1. 區分進行中的採買帳與歷史帳。<br>2. 結算後鎖定不允許任意改動。 | 抓取現役子帳：`WHERE status = 'active'`。 |
| **`note`** | `TEXT` | NULL | `string` | 專款用途說明與備註 | 記錄每週一預撥、週五報銷原則等專款約定。 | 說明備註。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 子帳開戶時間戳 (毫秒) | 排序與時間記錄。 | 排序使用。 |
| **`settledAt`** | `INTEGER` | NULL | `number` | 執行完畢結算時間戳 (毫秒) | 標記何時完成核銷並關閉子帳。 | 未結算時為 NULL。 |
| **`settlementNote`** | `TEXT` | NULL | `string` | 結算備註說明 (如「實支4820，繳回180現金」) | 記錄結算時現金繳回或差額說明。 | 稽核核銷紀錄。 |
| **`items`** | `TEXT` | NULL | `string` | 相容唯讀快照 (JSON 字串) | 歷史與外部 JSON 匯入匯出快照，主要正規化讀寫由 `sub_account_items` 負責。 | 請優先查閱 `sub_account_items` 表。 |

---

## 十二、資料表 10：`sub_account_items`（專案採買專款子帳明細表 - 正規化實體表）

### 1. 資料表簡介
**【正規化獨立資料表】** 記錄各專案採買子帳戶內部的每筆採買收支單據（如買菜、加油、五金、工具等）。每一筆明細皆為標準 SQL 資料列，記錄發票號碼、未稅/稅額、收據種類與報帳同仁，支援精準 SQL 統計與直接核銷轉入總帳。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 子帳採買明細唯一代碼 | 主鍵 (如 `item_1726000000_123`)。 | 唯一鍵值。 |
| **`subAccountId`** | `TEXT` | **NOT NULL (INDEX)**| `string` | 所屬專案子帳戶代碼 | **外鍵**，關聯 `sub_accounts.id`。 | `WHERE subAccountId = ?` |
| **`date`** | `TEXT` | **NOT NULL** | `string` | 採買發生日期 (`YYYY-MM-DD`) | 採買時間記錄。 | 日期區間過濾。 |
| **`type`** | `TEXT` | **NOT NULL** | `'expense' \| 'income'` | 收支類型 | `'expense'` (採買支出) \| `'income'` (追加款/歸墊款)。 | 計算子帳餘額。 |
| **`categoryId`** | `TEXT` | NULL | `string` | 預設主分類代碼 | 關聯 `categories.id`。 | 分類統計。 |
| **`categoryName`** | `TEXT` | NULL | `string` | 採買分類名稱快照 | 如「餐飲開銷」、「生鮮食材」、「油資五金」。 | 靜態快照，免 JOIN。 |
| **`subItem`** | `TEXT` | **NOT NULL** | `string` | 店家名稱 / 採買品項 | 如全聯福利中心、好市多、中油。 | 細項文字檢索。 |
| **`amount`** | `REAL` | **NOT NULL** | `number` | 採買實付金額 (NT$) | 明細單筆開銷。 | 金額加總。 |
| **`receiptType`** | `TEXT` | NULL | `'receipt' \| 'invoice' \| 'none'` | 憑證類型 | 發票、收據或無單據。 | 憑證統計。 |
| **`invoiceNumber`** | `TEXT` | NULL | `string` | 統一發票號碼 | 若取得發票則記錄發票號碼。 | 查核與營業稅扣抵。 |
| **`claimant`** | `TEXT` | NULL | `string` | 現場採買經辦同仁 | 誰去買的。 | 人員查核。 |
| **`note`** | `TEXT` | NULL | `string` | 備註說明 | 補充事由說明。 | 備註文字。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 建檔時間戳 (毫秒) | 排序使用。 | 毫秒數。 |
| **`isImportedToGeneral`** | `INTEGER` | 預設 `0` | `boolean` (`0` \| `1`) | 是否已匯入總帳零用金 | `1`: 已於結算時轉入 `transactions`；`0`: 尚未轉入。 | 避免重覆核銷。 |

---

## 十三、資料表 11：`director_withdrawals`（廠長/主管專用提領紀錄）

### 1. 資料表簡介
廠長或一級主管因廠務應急需求，常向零用金經管人員直接領取大額現金備用。本表專門獨立記錄提款時間與金額，供後續借支沖銷或主管簽核對帳使用。

### 2. 欄位結構定義表

| 欄位名稱 (Column) | SQLite 型態 | 必填/預設 | 對應 TypeScript 型別 | 變數代表意思 (商業含義) | 系統使用的地方與業務邏輯 | 未來程式直接撈取指引 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`id`** | `TEXT` | **PRIMARY KEY** | `string` | 提領唯一識別碼 (如 `dw_1726000000`) | 唯一標識該次提款紀錄。 | 唯一鍵值。 |
| **`date`** | `TEXT` | **NOT NULL** | `string` | 提領日期 (`YYYY-MM-DD`) | 提款時間記錄、月度主管提款走勢圖。 | 格式為 `YYYY-MM-DD`。 |
| **`amount`** | `REAL` | **NOT NULL** | `number` | 提領金額 (NT$) | 累計提領總額、單筆提款金額。 | 數值（例：`10000`）。 |
| **`note`** | `TEXT` | NULL | `string` | 提款事由備註 (如「廠務修繕預備金」) | 標記主管領款之用途或歸墊約定。 | 備註字串。 |
| **`createdAt`** | `INTEGER` | **NOT NULL** | `number` | 建立時間戳 (毫秒) | 建立時間排序。 | 毫秒時間戳。 |

---

## 十四、現成資料直接撈取指南（免重複設欄位之關鍵設計）

未來若有新模組或外接報表需求，請優先確認以下對應，**切勿重複增設冗餘欄位**：

| 新功能或業務需求 | 該去哪裡直接撈取資料？ | 欄位使用說明 |
| :--- | :--- | :--- |
| **1. 想要發票號碼清單做 401 營業稅申報 / 扣抵查核** | `transactions.invoiceNumber`, `receiptType`, `netAmount`, `taxAmount`, `sellerTaxId` | 下 `WHERE receiptType = 'invoice' AND invoiceNumber IS NOT NULL` 即可產出標準統一發票明細，未稅銷售額、營業稅額、買方統一編號一應俱全。 |
| **2. 想要查閱過去給客戶包了多少紅白包、交際花籃往來** | `customer_events` (實體表) 與 `customers` | 直接 `SELECT e.*, c.name FROM customer_events e JOIN customers c ON e.customerId = c.id` 即可回溯所有過往禮金金額、出席代表與零用金傳票編號。 |
| **3. 想要查詢客戶的所有對接聯絡窗口名單** | `customer_contacts` (實體表) | 下 `SELECT * FROM customer_contacts WHERE customerId = ? ORDER BY sortOrder ASC` 即可直接取得所有對接人員電話、手機與職稱。 |
| **4. 想要審查專案子帳的每筆採買明細發票** | `sub_account_items` (實體表) | 下 `SELECT * FROM sub_account_items WHERE subAccountId = ?` 即可查詢採買品項、發票號碼與金額。 |
| **5. 想要列印紙本黏存單或產生傳票編號** | `transactions.voucherNo` 或 `rawVoucherId` | 系統自帶高可讀性傳票號碼（如 `P2026090714-0001`）與帳務小管家標準號碼，免另建傳票序號產生器。 |
| **6. 想要統計各同仁（員工）請領金額排行** | `transactions.claimant` | 直接 `GROUP BY claimant` 就能完成員工請領開支排行榜，支援主管審閱與防弊查核。 |
| **7. 想要歷史分類開銷統計（即使用戶之後改了分類名稱）** | `transactions.categoryName` | 內建靜態快照，無需與 `categories` 表進行複雜的 JOIN，查詢極度快速且歷史資料永不失真。 |
| **8. 想要分析招待便當、聚餐之每人均價** | `transactions.peopleCount` 與 `amount` | 計算 `amount / peopleCount` 即可得出每人平均餐費，直接支援便當價格趨勢分析。 |
| **9. 想要追查這筆帳是哪一個採買專案結算匯入的** | `transactions.subAccountSourceId` 與 `subAccountSourceName` | 欄位已記錄來源子帳 ID 與名稱，一眼看出關聯，可直接反查 `sub_accounts`。 |
| **10. 想要計算目前零用金大水池手頭現金即時剩餘水位** | `transactions.type` 與 `amount` | 計算公式：`SUM(CASE WHEN type='income' THEN amount ELSE -amount END)`，即為全大水池手頭現金額度。 |
| **11. 想要監控當月是否超支或該叫主管撥補** | `budgets.budgetAmount` 與 `alertThresholdPercent` | 直接比對當月支出總和與預算金額，低於門檻即發送預警。 |
| **12. 想要查詢客戶/廠商的銀行匯款帳號進行撥款** | `customers.bankName`, `bankBranch`, `bankAccount`, `accountName` | 廠商開戶匯款帳號已完整記錄，工程出納可直接引用進行網銀批量匯款。 |

---

## 十五、常用 SQL 快速查詢範例（隨查隨用含 JOIN 關聯）

未來程式、報表腳本或資料庫管理工具（DBeaver / Navicat / VS Code SQLite）可直接複製以下 SQL 語句提取所需資料：

### 1. 查詢零用金大水池當前最新手頭現金總結餘 (Current Balance)
```sql
SELECT 
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) AS current_petty_cash_balance
FROM transactions;
```

### 2. 查詢 401 營業稅申報清冊（含發票號碼、賣方統編、未稅金額、稅額與報稅歸屬公司）
```sql
SELECT 
  t.date,
  t.voucherNo,
  t.invoiceNumber,
  t.sellerTaxId,
  t.subItem AS store_name,
  t.categoryName,
  t.netAmount AS sales_amount,
  t.taxAmount AS vat_5_percent,
  t.amount AS total_amount,
  cp.name AS filing_company_name,
  cp.taxId AS filing_company_tax_id
FROM transactions t
LEFT JOIN company_profile cp ON t.companyId = cp.id
WHERE t.receiptType = 'invoice' AND t.invoiceNumber IS NOT NULL AND t.invoiceNumber != ''
ORDER BY t.date DESC;
```

### 3. 【正規化 JOIN】查詢客戶所有交際送禮與紅白包紀錄 (含零用金核銷傳票)
```sql
SELECT 
  e.date,
  c.name AS customer_name,
  c.taxId AS customer_tax_id,
  e.title AS event_title,
  e.categoryLabel,
  e.amount AS gift_amount,
  e.direction,
  e.targetPerson AS recipient,
  e.ourRepresentative AS attendee,
  e.isPettyCashLinked,
  e.voucherNo,
  t.netAmount,
  t.taxAmount
FROM customer_events e
JOIN customers c ON e.customerId = c.id
LEFT JOIN transactions t ON e.linkedTransactionId = t.id
ORDER BY e.date DESC;
```

### 4. 【正規化 JOIN】查詢所有合作廠商及其主要聯絡人與匯款帳號
```sql
SELECT 
  c.name AS supplier_name,
  c.taxId,
  c.supplierCategory,
  ct.name AS contact_person,
  ct.title AS contact_title,
  ct.mobile AS contact_mobile,
  ct.email AS contact_email,
  c.bankName,
  c.bankBranch,
  c.bankAccount,
  c.accountName
FROM customers c
LEFT JOIN customer_contacts ct ON c.id = ct.customerId
WHERE c.isSupplier = 1
ORDER BY c.name ASC, ct.sortOrder ASC;
```

### 5. 【正規化 JOIN】查詢專案採買子帳戶明細與發票開立統計
```sql
SELECT 
  sa.name AS project_name,
  sa.custodian,
  si.date AS item_date,
  si.subItem AS purchased_item,
  si.amount,
  si.receiptType,
  si.invoiceNumber,
  si.isImportedToGeneral
FROM sub_account_items si
JOIN sub_accounts sa ON si.subAccountId = sa.id
WHERE sa.status = 'active'
ORDER BY sa.name ASC, si.date ASC;
```

### 6. 查詢指定月份各支出分類金額與佔比排行
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

### 7. 查詢各同仁 (經辦請領人) 累計請領金額排行
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

---

## 十六、資料庫模組化抽離備份與接力協同開發架構

針對多 AI Studio 開發者接力協同開發、換機帶著走、模組個別抽出與資料保密需求，系統實作了以下三層式資料庫管理機制：

### 1. 模組化獨立備份與附加 JSON 選項 (Modular Export)
避免單一備份檔案隨時間日益肥大，使用者可**單獨抽出任一模組**為獨立 JSON 檔案供人眼閱讀或外部編輯：
* `companies`：公司行號主檔 (`company_profile` 表)
* `customers`：客戶與廠商名冊、多聯絡人與交際歷程 (`customers`, `customer_contacts`, `customer_events` 表)
* `transactions`：零用金核心收支流水帳 (`transactions` 表)
* `categories_claimants`：系統分類階層與常用經辦名冊 (`categories`, `claimants` 表)
* `sub_accounts`：專案採買專款子帳戶與單據明細 (`sub_accounts`, `sub_account_items` 表)
* `budgets`：月份預算額度 (`budgets` 表)
* `director_withdrawals`：主管/廠長大額提領記錄 (`director_withdrawals` 表)

### 2. 標準 SQL 語法備份檔 (.sql) 一鍵匯出
系統提供 `GET /api/database/dump-sql`，動態產出包含全 11 大資料表 `CREATE TABLE` DDL 與全資料列 `INSERT INTO` DML 的標準純文字 SQL 檔案，可直接一鍵匯入至任何標準 SQLite、PostgreSQL 或 MySQL 工具。

### 3. 智慧模組精準還原 (Granular Restore & Mode)
還原備份檔案時，系統自動掃描檔案內含之模組與筆數，提供自由勾選：
* **只還原指定模組**：如僅勾選「客戶與廠商名冊」，未選取的流水帳與公司設定完全維持現況、零風險。
* **兩種還原模式**：
  1. `replace`（鏡像覆蓋替換）：清空所選模組資料表並覆蓋寫入，自動同步更新關聯實體表。
  2. `merge`（智慧合併追加）：依主鍵 ID 或統一編號比對更新，新資料追加，舊資料保留。

### 4. 商業機密資料保護 (AES-256-GCM 加密)
* 採用現代標準 Web Crypto API 原生 `AES-GCM-256` 對稱加密。
* 密鑰由使用者自訂密碼搭配 PBKDF2（100,000 次雜湊疊代 + SHA-256 + 16 bytes 隨機鹽值）動態生成。
* 產出之加密檔案為 `.enc.json`，內部包含初始化向量（IV）、鹽值（Salt）與加密密文，非經密碼無法被任何人反查。

---

## 結語與維護紀錄
- **版本**：v3.1 (全面支援無統編自然人/私人出資主體、外部表單三公司聯名抬頭過濾、私帳與機密屬性隔離、查帳防護模式與 401 稅務外帳拆分)
- **維護者**：公司零用金與 ERP 系統工程組
- **更新日期**：2026-09-24
- **本次更新重點 (v3.1)**：
  1. `company_profile`：新增 `entityType` (`'corporate'` | `'individual'`)，支援無統編自然人/私人戶主體，僅留負責人姓名即可開案與出納收款。
  2. `company_profile`：新增 `isJointHeader` (布林值)，外部表單抬頭印製三間公司正式名稱時，自動排除個人名字，避免給客戶看時突兀。
  3. `company_profile`：新增 `isConfidential` (布林值)，機密私帳主體在外部查帳模式與一般導覽列下拉選單中可一鍵遮蔽屏蔽。
  4. `company_bank_accounts`：新增 `isPrivateAccount` (負責人私人名義戶) 與 `isConfidential` (機密帳戶標記)。
  5. `transactions`：新增 `accountingCategory` (`'official_tax'` 稅務外帳公帳 vs `'internal_management'` 內部管理私帳)、`isConfidential` (敏感機密款項)。
  6. 前端 UI：各報表中心、流水帳、開支登記與頂部切換選單均全面連動「🛡️ 查帳防護模式」，一鍵排除機密私帳，免除國稅局或外部查帳之合規疑慮。
- **異動規範**：如未來確有不可替代之新業務需求需增修欄位，請同步更新本檔案與 `/server/db.ts` 中的 `initSchema`，以確保全系統文件與程式一致。
