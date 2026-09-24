import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  getDb,
  getDatabaseFilePath,
  getAllTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  replaceAllTransactions,
  getAllCategories,
  saveAllCategories,
  getAllClaimants,
  saveAllClaimants,
  getAllBudgets,
  saveAllBudgets,
  getAllSubAccounts,
  saveAllSubAccounts,
  getAllDirectorWithdrawals,
  saveAllDirectorWithdrawals,
  getCompanyProfile,
  getAllCompanyProfiles,
  saveCompanyProfile,
  saveAllCompanyProfiles,
  deleteCompanyProfile,
  getAllCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  replaceAllCustomers,
  getAllCustomerEvents,
  getAllCustomerContacts,
  getAllSubAccountItems,
  replaceWithDatabaseBinary,
  generateSqlDump,
  getFullDatabaseJsonExport,
  getModularDatabaseJsonExport,
  restoreModularData,
  persist
} from './server/db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 啟用 JSON 解析 (上限 50MB 以支援完整資料庫匯入/備份)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 支援原生二進位 SQLite 檔案上傳
  app.use(
    '/api/database/upload-raw',
    express.raw({ type: '*/*', limit: '50mb' })
  );

  // 初始化資料庫
  await getDb();

  // =================================================================
  // API 路由
  // =================================================================

  // 系統健康檢查與資料庫狀態
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      engine: 'SQLite3 (sql.js / WebAssembly)',
      dbFile: getDatabaseFilePath(),
      timestamp: Date.now()
    });
  });

  // 一次性取得所有初始資料 (Bootstrap，大幅提升前端載入效能)
  app.get('/api/bootstrap', async (req, res) => {
    try {
      const [
        transactions,
        categories,
        claimants,
        budgets,
        subAccounts,
        directorWithdrawals,
        companyProfile,
        companies,
        customers
      ] = await Promise.all([
        getAllTransactions(),
        getAllCategories(),
        getAllClaimants(),
        getAllBudgets(),
        getAllSubAccounts(),
        getAllDirectorWithdrawals(),
        getCompanyProfile(),
        getAllCompanyProfiles(),
        getAllCustomers()
      ]);

      res.json({
        success: true,
        source: 'sqlite',
        dbPath: 'data/petty_cash.sqlite',
        transactions,
        categories,
        claimants,
        budgets,
        subAccounts,
        directorWithdrawals,
        companyProfile,
        companies,
        customers
      });
    } catch (err: any) {
      console.error('Error fetching bootstrap data:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 交易紀錄 API
  app.get('/api/transactions', async (req, res) => {
    try {
      const transactions = await getAllTransactions();
      res.json({ success: true, data: transactions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      const transaction = req.body;
      if (!transaction.id || !transaction.date || !transaction.amount) {
        return res.status(400).json({ success: false, error: '缺少必要欄位' });
      }
      await addTransaction(transaction);
      res.json({ success: true, data: transaction });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/transactions/:id', async (req, res) => {
    try {
      const transaction = req.body;
      await updateTransaction(transaction);
      res.json({ success: true, data: transaction });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    try {
      await deleteTransaction(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/transactions-batch', async (req, res) => {
    try {
      const { transactions } = req.body;
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ success: false, error: '格式錯誤，必須為陣列' });
      }
      await replaceAllTransactions(transactions);
      res.json({ success: true, count: transactions.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 分類設定 API
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await getAllCategories();
      res.json({ success: true, data: categories });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/categories', async (req, res) => {
    try {
      const { categories } = req.body;
      if (!Array.isArray(categories)) {
        return res.status(400).json({ success: false, error: '格式錯誤' });
      }
      await saveAllCategories(categories);
      res.json({ success: true, data: categories });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 請領人名冊 API
  app.get('/api/claimants', async (req, res) => {
    try {
      const claimants = await getAllClaimants();
      res.json({ success: true, data: claimants });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/claimants', async (req, res) => {
    try {
      const { claimants } = req.body;
      if (!Array.isArray(claimants)) {
        return res.status(400).json({ success: false, error: '格式錯誤' });
      }
      await saveAllClaimants(claimants);
      res.json({ success: true, data: claimants });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 預算設定 API
  app.get('/api/budgets', async (req, res) => {
    try {
      const budgets = await getAllBudgets();
      res.json({ success: true, data: budgets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/budgets', async (req, res) => {
    try {
      const { budgets } = req.body;
      await saveAllBudgets(budgets || {});
      res.json({ success: true, data: budgets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 專案採買子帳戶 API
  app.get('/api/sub-accounts', async (req, res) => {
    try {
      const subAccounts = await getAllSubAccounts();
      res.json({ success: true, data: subAccounts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/sub-accounts', async (req, res) => {
    try {
      const { subAccounts } = req.body;
      if (!Array.isArray(subAccounts)) {
        return res.status(400).json({ success: false, error: '格式錯誤' });
      }
      await saveAllSubAccounts(subAccounts);
      res.json({ success: true, data: subAccounts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 廠長專用領款 API
  app.get('/api/director-withdrawals', async (req, res) => {
    try {
      const withdrawals = await getAllDirectorWithdrawals();
      res.json({ success: true, data: withdrawals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/director-withdrawals', async (req, res) => {
    try {
      const { withdrawals } = req.body;
      if (!Array.isArray(withdrawals)) {
        return res.status(400).json({ success: false, error: '格式錯誤' });
      }
      await saveAllDirectorWithdrawals(withdrawals);
      res.json({ success: true, data: withdrawals });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 公司基本設定與表格抬頭 API (支援多行號/關係企業)
  app.get('/api/companies', async (req, res) => {
    try {
      const companies = await getAllCompanyProfiles();
      res.json({ success: true, data: companies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/companies', async (req, res) => {
    try {
      const { companies } = req.body;
      if (!Array.isArray(companies)) {
        return res.status(400).json({ success: false, error: '格式錯誤，必須為公司陣列' });
      }
      await saveAllCompanyProfiles(companies);
      const updated = await getAllCompanyProfiles();
      res.json({ success: true, data: updated, message: '全數公司行號設定已成功儲存！' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/companies/:id', async (req, res) => {
    try {
      const company = req.body;
      if (!company || typeof company !== 'object') {
        return res.status(400).json({ success: false, error: '格式錯誤' });
      }
      company.id = req.params.id;
      await saveCompanyProfile(company);
      const updated = await getAllCompanyProfiles();
      res.json({ success: true, data: updated, message: '公司行號設定已更新！' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/companies/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await deleteCompanyProfile(id);
      const updated = await getAllCompanyProfiles();
      res.json({ success: true, data: updated, message: '公司行號已刪除' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/company-profile', async (req, res) => {
    try {
      const id = req.query.id as string | undefined;
      const profile = await getCompanyProfile(id);
      res.json({ success: true, data: profile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/company-profile', async (req, res) => {
    try {
      const profile = req.body;
      if (!profile || typeof profile !== 'object') {
        return res.status(400).json({ success: false, error: '格式錯誤' });
      }
      await saveCompanyProfile(profile);
      const updated = await getCompanyProfile(profile.id);
      res.json({ success: true, data: updated, message: '公司設定已成功儲存至 SQLite 資料庫！' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =================================================================
  // 客戶聯絡資訊管理 API (支援新增/修改/刪除/整批匯入)
  // =================================================================

  app.get('/api/customers', async (req, res) => {
    try {
      const customers = await getAllCustomers();
      res.json({ success: true, data: customers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/customers', async (req, res) => {
    try {
      const customer = req.body;
      if (!customer || !customer.id || !customer.name) {
        return res.status(400).json({ success: false, error: '客戶姓名/名稱為必填項目' });
      }
      await addCustomer(customer);
      const updated = await getAllCustomers();
      res.json({ success: true, data: updated, message: '客戶聯絡資訊已成功新增！' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const customer = req.body;
      if (!customer || !customer.name) {
        return res.status(400).json({ success: false, error: '客戶姓名/名稱為必填項目' });
      }
      customer.id = id;
      await updateCustomer(customer);
      const updated = await getAllCustomers();
      res.json({ success: true, data: updated, message: '客戶聯絡資訊已更新完成！' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/customers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deleteCustomer(id);
      const updated = await getAllCustomers();
      res.json({ success: true, data: updated, message: '客戶資料已成功刪除！' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/customers/batch', async (req, res) => {
    try {
      const { customers } = req.body;
      if (!Array.isArray(customers)) {
        return res.status(400).json({ success: false, error: '資料格式錯誤' });
      }
      await replaceAllCustomers(customers);
      const updated = await getAllCustomers();
      res.json({ success: true, data: updated, message: '客戶資料已全數同步！' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 取得所有正規化交際紅白包與客戶往來事件記錄 (支援 SQL JOIN 客戶名稱)
  app.get('/api/customer-events', async (req, res) => {
    try {
      const events = await getAllCustomerEvents();
      res.json({ success: true, data: events });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 取得所有正規化客戶/廠商主要與次要聯絡人資料
  app.get('/api/customer-contacts', async (req, res) => {
    try {
      const contacts = await getAllCustomerContacts();
      res.json({ success: true, data: contacts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 取得所有專款專用子帳戶明細項目 (sub_account_items)
  app.get('/api/sub-account-items', async (req, res) => {
    try {
      const items = await getAllSubAccountItems();
      res.json({ success: true, data: items });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =================================================================
  // 資料庫帶著走特權 API：實體 SQLite 檔案下載與還原
  // =================================================================

  // 下載實體 petty_cash.sqlite 檔案 (使用者可隨時隨身碟拷貝帶著走)
  app.get('/api/database/download', (req, res) => {
    try {
      persist(); // 確保最新狀態已寫入磁碟
      const filePath = getDatabaseFilePath();
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: '資料庫檔案尚未建立' });
      }
      res.setHeader('Content-Type', 'application/vnd.sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="petty_cash.sqlite"');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 匯出純文字標準 SQL 語法備份檔 (.sql)，包含全資料表結構 DDL 與全資料列 INSERT INTO
  app.get('/api/database/dump-sql', async (req, res) => {
    try {
      persist();
      const sqlDump = await generateSqlDump();
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const filename = `petty_cash_database_dump_${dateStr}.sql`;

      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(sqlDump);
    } catch (err: any) {
      console.error('Error generating SQL dump:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 匯出完整全庫或單一模組 JSON 備份檔 (.json)
  app.get('/api/database/dump-json', async (req, res) => {
    try {
      persist();
      const moduleKey = req.query.module ? String(req.query.module) : undefined;
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

      if (moduleKey) {
        const modularJson = await getModularDatabaseJsonExport(moduleKey);
        const filename = `backup_${moduleKey}_${dateStr}.json`;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(JSON.stringify(modularJson, null, 2));
      }

      const fullJson = await getFullDatabaseJsonExport();
      const filename = `petty_cash_full_backup_${dateStr}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(fullJson, null, 2));
    } catch (err: any) {
      console.error('Error generating JSON backup:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 智慧模組精準還原 API (支援選擇模組與覆蓋/合併模式)
  app.post('/api/database/restore-modular', async (req, res) => {
    try {
      const { data, modules, mode } = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ success: false, error: '請提供有效的備份資料內容' });
      }
      if (!Array.isArray(modules) || modules.length === 0) {
        return res.status(400).json({ success: false, error: '請至少選取一個欲還原的模組' });
      }

      const result = await restoreModularData(data, modules, mode || 'replace');
      res.json({
        success: true,
        message: `🎉 所選 ${modules.length} 個模組資料已成功完成${mode === 'merge' ? '智慧合併追加' : '鏡像覆蓋替換'}還原！`,
        result
      });
    } catch (err: any) {
      console.error('Error restoring modular backup:', err);
      res.status(500).json({ success: false, error: `模組還原失敗: ${err.message}` });
    }
  });

  // 將當前 SQLite 實體資料庫同步匯出為 Git 種子資料集 (data/seeds/*.json)
  app.post('/api/database/export-seeds', async (req, res) => {
    try {
      persist();
      const seedsDir = path.join(process.cwd(), 'data', 'seeds');
      if (!fs.existsSync(seedsDir)) {
        fs.mkdirSync(seedsDir, { recursive: true });
      }

      const modules = [
        'companies',
        'customers',
        'transactions',
        'categories_claimants',
        'sub_accounts',
        'budgets',
        'director_withdrawals'
      ];

      for (const mod of modules) {
        const modData = await getModularDatabaseJsonExport(mod);
        fs.writeFileSync(
          path.join(seedsDir, `${mod}.json`),
          JSON.stringify(modData, null, 2),
          'utf-8'
        );
      }

      res.json({
        success: true,
        message: '🎉 已成功將最新資料庫資料匯出至 data/seeds/*.json！可用於 Git 追蹤與接力協同開發。'
      });
    } catch (err: any) {
      console.error('Error exporting seeds:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 上傳外部實體 petty_cash.sqlite 檔案、.sql 腳本檔 或 JSON 備份檔 (從其他電腦直接搬移載入或備份恢復)
  app.post('/api/database/upload-raw', async (req, res) => {
    try {
      const rawBuffer = req.body;
      if (!rawBuffer || !(rawBuffer instanceof Buffer) || rawBuffer.length < 16) {
        return res.status(400).json({ success: false, error: '請提供有效的資料庫檔案 (大小異常或為空)' });
      }

      // 1. 檢查是否為標準 SQLite 3 資料庫二進位檔 (以 "SQLite format 3\0" 為開頭)
      const isSqlite = rawBuffer.length >= 16 && rawBuffer.slice(0, 16).toString('ascii').startsWith('SQLite format 3');
      if (isSqlite) {
        await replaceWithDatabaseBinary(new Uint8Array(rawBuffer));
        return res.json({ success: true, message: '🎉 SQLite 資料庫實體檔案已成功載入並替換！所有公司主檔與記帳明細已 100% 恢復！', type: 'sqlite' });
      }

      // 2. 檢查是否為 Excel 試算表 (.xlsx 是 ZIP 結構，以 PK\x03\x04 開頭)
      if (rawBuffer.length >= 4 && rawBuffer[0] === 0x50 && rawBuffer[1] === 0x4b && rawBuffer[2] === 0x03 && rawBuffer[3] === 0x04) {
        return res.status(400).json({
          success: false,
          error: '您上傳的是 Excel 試算表檔案 (.xlsx)。若要匯入多筆交易流水帳，請至主畫面點擊【快速匯入】功能；此處僅供載入 .sqlite 實體資料庫、.sql 語法腳本或 .json 備份檔。'
        });
      }

      // 3. 檢查是否為文字型檔案 (如 SQL 腳本、JSON 備份檔、CSV 檔)
      let textContent = '';
      try {
        textContent = rawBuffer.toString('utf-8').trim();
      } catch (e) {
        // Not valid text
      }

      console.log('upload-raw textContent start:', textContent.slice(0, 30), 'end:', textContent.slice(-10));

      // 4. 智慧檢查是否為標準 SQL 語法備份檔 (.sql)
      if (
        (textContent.includes('CREATE TABLE') || textContent.includes('INSERT INTO')) &&
        (textContent.includes('company_profile') || textContent.includes('transactions') || textContent.includes('categories'))
      ) {
        try {
          const database = await getDb();
          database.exec(textContent);
          persist();
          return res.json({
            success: true,
            message: '🎉 SQL 指令腳本已成功執行！全資料庫 100% 鏡像還原（包含全部公司主檔、收支流水與系統設定）！',
            type: 'sql'
          });
        } catch (sqlErr: any) {
          return res.status(400).json({
            success: false,
            error: `SQL 腳本還原執行失敗：${sqlErr.message}`
          });
        }
      }

      // 5. 智慧檢查是否為 JSON 備份檔 (包含 transactions / categories / claimants / subAccounts 等)
      if (textContent.startsWith('{')) {
        try {
          const parsed = JSON.parse(textContent);
          const hasData =
            Array.isArray(parsed.transactions) ||
            Array.isArray(parsed.categories) ||
            Array.isArray(parsed.claimants) ||
            Array.isArray(parsed.companies) ||
            Array.isArray(parsed.customers) ||
            Array.isArray(parsed.subAccounts);

          if (hasData) {
            // 自動無縫還原 JSON 資料進 SQLite 資料庫！
            if (Array.isArray(parsed.transactions)) {
              await replaceAllTransactions(parsed.transactions);
            }
            if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
              await saveAllCategories(parsed.categories);
            }
            if (Array.isArray(parsed.claimants) && parsed.claimants.length > 0) {
              await saveAllClaimants(parsed.claimants);
            }
            if (parsed.budgets && typeof parsed.budgets === 'object') {
              await saveAllBudgets(parsed.budgets);
            }
            if (Array.isArray(parsed.subAccounts)) {
              await saveAllSubAccounts(parsed.subAccounts);
            }
            if (Array.isArray(parsed.directorWithdrawals)) {
              await saveAllDirectorWithdrawals(parsed.directorWithdrawals);
            }
            if (Array.isArray(parsed.companies) && parsed.companies.length > 0) {
              await saveAllCompanyProfiles(parsed.companies);
            } else if (parsed.companyProfile) {
              await saveCompanyProfile(parsed.companyProfile);
            }
            if (Array.isArray(parsed.customers)) {
              await replaceAllCustomers(parsed.customers);
            }

            persist();
            return res.json({
              success: true,
              message: `🎉 系統已自動辨識為 JSON 備份檔，並成功將 ${parsed.transactions?.length || 0} 筆記帳與完整設定無縫還原至 SQLite 資料庫！`,
              type: 'json',
              stats: {
                transactions: parsed.transactions?.length || 0,
                categories: parsed.categories?.length || 0
              }
            });
          } else {
            return res.status(400).json({
              success: false,
              error: 'JSON 格式不符：找不到 transactions、categories 等必要備份節點。'
            });
          }
        } catch (jsonErr: any) {
          return res.status(400).json({
            success: false,
            error: `JSON 備份檔案解析或還原失敗：${jsonErr.message}`
          });
        }
      }

      // 5. 檢查是否為 CSV 格式文字檔
      if (textContent.includes(',') || textContent.includes('\t') || textContent.includes('帳務小管家')) {
        return res.status(400).json({
          success: false,
          error: '您上傳的是 CSV/文字試算表檔案。若要匯入多筆交易流水帳或帳務小管家資料，請至主畫面點擊【快速匯入】；此處僅供載入 .sqlite 實體資料庫或 .json 備份檔。'
        });
      }

      // 6. 其他不符合規格的檔案
      return res.status(400).json({
        success: false,
        error: '檔案格式不符：非標準 SQLite 3 資料庫（檔案缺少 SQLite format 3 格式標頭）或 JSON 備份檔。請確認是否選取正確的檔案。'
      });
    } catch (err: any) {
      console.error('Error handling database upload:', err);
      res.status(500).json({ success: false, error: err.message || '資料庫還原發生未預期錯誤' });
    }
  });

  // 從舊版前端 localStorage 快照一鍵無縫遷移至 SQLite
  app.post('/api/database/migrate-from-local', async (req, res) => {
    try {
      const {
        transactions = [],
        categories = [],
        claimants = [],
        budgets = {},
        subAccounts = [],
        directorWithdrawals = []
      } = req.body;

      if (transactions.length > 0) {
        await replaceAllTransactions(transactions);
      }
      if (categories.length > 0) {
        await saveAllCategories(categories);
      }
      if (claimants.length > 0) {
        await saveAllClaimants(claimants);
      }
      if (Object.keys(budgets).length > 0) {
        await saveAllBudgets(budgets);
      }
      if (subAccounts.length > 0) {
        await saveAllSubAccounts(subAccounts);
      }
      if (directorWithdrawals.length > 0) {
        await saveAllDirectorWithdrawals(directorWithdrawals);
      }

      res.json({
        success: true,
        message: '瀏覽器舊資料已成功遷移至 SQLite 資料庫！',
        stats: {
          transactions: transactions.length,
          categories: categories.length,
          claimants: claimants.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // =================================================================
  // Vite 中介軟體 (開發階段) / 靜態檔案服務 (生產階段)
  // =================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 零用金財務系統伺服器已於 http://0.0.0.0:${PORT} 啟動`);
    console.log(`📦 SQLite 資料庫位置: ${getDatabaseFilePath()}`);
  });
}

startServer().catch((err) => {
  console.error('伺服器啟動失敗:', err);
});
