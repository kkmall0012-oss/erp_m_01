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
  replaceWithDatabaseBinary,
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
        companies
      ] = await Promise.all([
        getAllTransactions(),
        getAllCategories(),
        getAllClaimants(),
        getAllBudgets(),
        getAllSubAccounts(),
        getAllDirectorWithdrawals(),
        getCompanyProfile(),
        getAllCompanyProfiles()
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
        companies
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

  // 上傳外部實體 petty_cash.sqlite 檔案 (從其他電腦直接搬移載入)
  app.post('/api/database/upload-raw', async (req, res) => {
    try {
      const rawBuffer = req.body;
      if (!rawBuffer || !(rawBuffer instanceof Buffer) || rawBuffer.length < 100) {
        return res.status(400).json({ success: false, error: '請提供有效的 SQLite 資料庫檔案' });
      }
      await replaceWithDatabaseBinary(new Uint8Array(rawBuffer));
      res.json({ success: true, message: 'SQLite 資料庫已成功載入並替換！' });
    } catch (err: any) {
      console.error('Error replacing sqlite db:', err);
      res.status(500).json({ success: false, error: err.message });
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
