/**
 * 🌙 月島甜點 - 完整整合版（最終版）
 * 
 * ✅ 包含所有功能：
 * 1. Raw_Transactions - 原始交易資料（從 Firestore 同步）
 * 2. Raw_DailyClosings - 每日結帳記錄（從 Firestore 同步）
 * 3. FixedCosts - 固定成本（手動輸入）
 * 4. Daily_Summary - 每日營收總表（公式自動計算）
 * 5. Expense_Detail - 支出紀錄明細（公式自動篩選）
 * 6. 月損益表_P&L - 月損益表（公式自動計算）
 * 7. Bills_History - 點鈔機記錄（從 Firestore 同步）
 * 
 * ✅ 核心原則：
 * - 公式驅動架構（Daily_Summary、Expense_Detail、月損益表_P&L 都用公式）
 * - 向後兼容（支援舊的 emoji 工作表名稱）
 * - 增量同步（不會覆蓋既有資料）
 * - 日期格式統一（yyyy-MM-dd 文字格式）
 */

// ==========================================
// 🧭 工作表命名（支援新舊名稱）
// ==========================================
const SHEETS = {
  RAW_TX: 'Raw_Transactions',
  RAW_CLOSINGS: 'Raw_DailyClosings',
  FIXED_COSTS: 'FixedCosts',
  DAILY_SUMMARY: 'Daily_Summary',
  EXPENSE_DETAIL: 'Expense_Detail',
  PL_STATEMENT: '月損益表_P&L',
  BILLS_HISTORY: 'Bills_History',
  SYNC_LOGS: 'Sync_Logs',
};

// 舊名稱（含 emoji）→ 新名稱（無 emoji）
const SHEET_RENAME_MAP = {
  '🔴 Raw_Transactions': SHEETS.RAW_TX,
  '🔴 Raw_DailyClosings': SHEETS.RAW_CLOSINGS,
  '🔵 固定成本_FixedCosts': SHEETS.FIXED_COSTS,
  '📅 每日營收總表': SHEETS.DAILY_SUMMARY,
  '📋 支出紀錄明細': SHEETS.EXPENSE_DETAIL,
  '🟡 月損益表_P&L': SHEETS.PL_STATEMENT,
  '🟣 點鈔機記錄': SHEETS.BILLS_HISTORY,
  '🟠 Sync_Logs': SHEETS.SYNC_LOGS,
};

// ==========================================
// 🔐 安全配置
// ==========================================
const CONFIG = (() => {
  const props = PropertiesService.getScriptProperties();
  return {
    client_email: props.getProperty('SERVICE_ACCOUNT_EMAIL'),
    private_key: props.getProperty('SERVICE_ACCOUNT_PRIVATE_KEY'),
    project_id: props.getProperty('FIREBASE_PROJECT_ID'),
    timezone: 'GMT+8',
  };
})();

// ==========================================
// 🔐 設定敏感資訊
// ==========================================
function setupSecrets() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  const email = ui.prompt('設定 SERVICE_ACCOUNT_EMAIL', '請輸入 service account email', ui.ButtonSet.OK_CANCEL);
  if (email.getSelectedButton() !== ui.Button.OK) return;

  const projectId = ui.prompt('設定 FIREBASE_PROJECT_ID', '請輸入 Firebase/GCP project id', ui.ButtonSet.OK_CANCEL);
  if (projectId.getSelectedButton() !== ui.Button.OK) return;

  const key = ui.prompt('設定 SERVICE_ACCOUNT_PRIVATE_KEY', '請貼上 private_key（含 \\n）', ui.ButtonSet.OK_CANCEL);
  if (key.getSelectedButton() !== ui.Button.OK) return;

  props.setProperty('SERVICE_ACCOUNT_EMAIL', email.getResponseText().trim());
  props.setProperty('FIREBASE_PROJECT_ID', projectId.getResponseText().trim());
  props.setProperty('SERVICE_ACCOUNT_PRIVATE_KEY', key.getResponseText().replace(/\\n/g, '\n').trim());

  ui.alert('✅ 已寫入 Script Properties');
}

// ==========================================
// 📋 選單
// ==========================================
// ==========================================
// 📋 選單
// ==========================================
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🍰 月島甜點系統')
      .addItem('🔄 立即同步今日帳務', 'syncTodayNow')
      .addItem('🔍 檢查 Firebase 連線', 'checkFirebaseConnection')
      .addItem('📊 查看同步日誌', 'viewSyncLogs')
      .addSeparator()
      .addItem('🔧 初始化/重建所有工作表', 'initializeAllSheets')
      .addItem('🔄 重新設定公式', 'setupFormulas')
      .addItem('🔐 設定敏感資訊', 'setupSecrets')
      .addItem('🔑 設定管理 PIN 碼', 'setupPin')
      .addToUi();
  } catch (e) {
    Logger.log('選單建立失敗: ' + e.toString());
  }
}

// ==========================================
// 🌐 Web API (前端對接入口)
// ==========================================
function doPost(e) {
  // CORS 處理 (如果需要跨域讀取回應，可能需要其他技巧，但標準 POST JSON 通常如下回應)
  const output = { valid: false, message: 'Unknown error' };
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No data received");
    }
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'verify-pin') {
      return handleVerifyPin(data);
    } else {
      output.message = 'Unknown action: ' + action;
    }
    
  } catch (err) {
    output.message = err.toString();
  }
  
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleVerifyPin(data) {
  const inputPin = data.pin;
  const storedPin = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  
  // 如果沒有設定 PIN，預設為 0000
  const validPin = storedPin || '0000';
  
  const result = {
    valid: String(inputPin) === String(validPin),
    message: String(inputPin) === String(validPin) ? 'Success' : 'Invalid PIN'
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 🔑 設定管理 PIN
// ==========================================
function setupPin() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt('設定管理 PIN 碼', '請輸入新的 4-8 位數字 PIN 碼', ui.ButtonSet.OK_CANCEL);
  
  if (result.getSelectedButton() === ui.Button.OK) {
    const newPin = result.getResponseText().trim();
    if (/^\d{4,8}$/.test(newPin)) {
      PropertiesService.getScriptProperties().setProperty('ADMIN_PIN', newPin);
      ui.alert(`✅ PIN 碼已更新為：${newPin}`);
    } else {
      ui.alert('❌ 格式錯誤！請輸入 4-8 位數字。');
    }
  }
}


// ==========================================
// ⏰ 觸發器設定 (自動同步)
// ==========================================
function setupTriggers() {
  const ui = SpreadsheetApp.getUi();
  const triggers = ScriptApp.getProjectTriggers();
  
  // 檢查是否已有觸發器
  const existing = triggers.find(t => t.getHandlerFunction() === 'syncTodayNow');
  
  if (existing) {
    const response = ui.alert('⚠️ 觸發器已存在', '是否要重新設定？', ui.ButtonSet.YES_NO);
    if (response === ui.Button.NO) return;
    ScriptApp.deleteTrigger(existing);
  }
  
  // 建立新的每小時觸發器
  ScriptApp.newTrigger('syncTodayNow')
    .timeBased()
    .everyHours(1)
    .create();
    
  ui.alert('✅ 已設定自動同步：每小時執行一次');
}

// ==========================================
// 🔧 初始化所有工作表 (優化版：使用日期格式)
// ==========================================
function initializeAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const currentYear = new Date().getFullYear();
  
  // 1. Raw_Transactions（原始資料庫）
  let rawSheet = getOrCreateSheet(ss, SHEETS.RAW_TX, ['🔴 Raw_Transactions']);
  const rawHeaders = ['日期', '時間', '類別', '項目/支付方式', '金額', '手續費', '淨額', '來源/備註', '狀態', 'ID'];
  rawSheet.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
  rawSheet.getRange(1, 1, 1, rawHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
  rawSheet.setFrozenRows(1);
  // 核心邏輯修正：使用日期格式而非純文字，以便 P&L 月份篩選
  rawSheet.getRange('A:A').setNumberFormat('yyyy-mm-dd'); 
  
  // 2. Raw_DailyClosings（每日結帳記錄）
  let closingsSheet = getOrCreateSheet(ss, SHEETS.RAW_CLOSINGS, ['🔴 Raw_DailyClosings']);
  const closingsHeaders = ['日期', '經手人', '系統應有', '實際點算', '差異', '差異原因', '今日提領', '明日保留'];
  closingsSheet.getRange(1, 1, 1, closingsHeaders.length).setValues([closingsHeaders]);
  closingsSheet.getRange(1, 1, 1, closingsHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
  closingsSheet.setFrozenRows(1);
  closingsSheet.getRange('A:A').setNumberFormat('yyyy-mm-dd');
  
  // 3. FixedCosts（固定成本 - 手動輸入）
  let fixedSheet = getOrCreateSheet(ss, SHEETS.FIXED_COSTS, ['🔵 固定成本_FixedCosts']);
  const fixedHeaders = ['歸屬年份', '歸屬月份', '支出類別', '項目名稱', '金額', '備註/支付方式'];
  fixedSheet.getRange(1, 1, 1, fixedHeaders.length).setValues([fixedHeaders]);
  fixedSheet.getRange(1, 1, 1, fixedHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
  fixedSheet.setFrozenRows(1);
  
  // 如果 FixedCosts 是空的，加入範例資料
  if (fixedSheet.getLastRow() === 1) {
    fixedSheet.getRange(2, 1, 4, 6).setValues([
      [currentYear, '01', '租金支出', '店面房租', 35000, '銀行轉帳'],
      [currentYear, '01', '人事支出', '員工薪資', 80000, '銀行轉帳'],
      [currentYear, '01', '水電費', '電費預估', 5000, '信用卡'],
      [currentYear, '01', '網路費', '中華電信', 1200, '信用卡']
    ]);
  }
  
  // 4. Daily_Summary（用公式彙總）
  let dailySheet = getOrCreateSheet(ss, SHEETS.DAILY_SUMMARY, ['📅 每日營收總表']);
  dailySheet.getRange(1, 1).setValue('▼ 每日收支明細 (自動更新)');
  const dailyHeaders = ['現金營收', '轉帳營收', 'LINE Pay營收', 'Google預訂營收', 'Uber營收', '當日總營收', '平台抽成費用', '變動支出(App)', '固定成本(攤提)', '預估淨入帳'];
  // 注意：這裡表頭有些微調整，確保對齊
  dailySheet.getRange(1, 2, 1, dailyHeaders.length).setValues([dailyHeaders]);
  dailySheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#EFEFEF');
  dailySheet.setFrozenRows(1);
  dailySheet.getRange('A:A').setNumberFormat('yyyy-mm-dd');
  
  // 5. Expense_Detail（用公式篩選支出）
  let expSheet = getOrCreateSheet(ss, SHEETS.EXPENSE_DETAIL, ['📋 支出紀錄明細']);
  const expHeaders = ['日期', '成本屬性', '支出類別', '品項', '支付方式', '金額', '備註'];
  expSheet.getRange(1, 1, 1, expHeaders.length).setValues([expHeaders]);
  expSheet.getRange(1, 1, 1, expHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
  expSheet.setFrozenRows(1);
  expSheet.getRange('A:A').setNumberFormat('yyyy-mm-dd');
  
  // 6. 月損益表_P&L（用公式計算）
  let plSheet = getOrCreateSheet(ss, SHEETS.PL_STATEMENT, ['🟡 月損益表_P&L']);
  const plHeaders = ['項目', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '年度總計'];
  plSheet.getRange(1, 1, 1, plHeaders.length).setValues([plHeaders]);
  plSheet.getRange(1, 1, 1, plHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
  plSheet.setFrozenRows(1);
  
  // 設定月損益表的標籤
  const plLabels = [
    ['【營業收入】'],
    ['(+) 營業額'],
    ['(-) 平台手續費'],
    ['(=) 實際營收'],
    [''],
    ['【營業成本 (變動)】'],
    ['(-) 食材/包材支出'],
    ['(=) 營業毛利'],
    [''],
    ['【營業費用 (固定)】'],
    ['(-) 店面租金'],
    ['(-) 人事薪資'],
    ['(-) 水電/雜支'],
    [''],
    ['【本期淨利】']
  ];
  if (plSheet.getLastRow() === 1) {
    plSheet.getRange(2, 1, plLabels.length, 1).setValues(plLabels);
  }
  
  // 7. Bills_History（點鈔機記錄）
  let billsSheet = getOrCreateSheet(ss, SHEETS.BILLS_HISTORY, ['🟣 點鈔機記錄']);
  const billsHeaders = ['日期', '時間', '1000元', '500元', '200元', '100元', '50元', '20元', '10元', '5元', '1元', '總計'];
  billsSheet.getRange(1, 1, 1, billsHeaders.length).setValues([billsHeaders]);
  billsSheet.getRange(1, 1, 1, billsHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
  billsSheet.setFrozenRows(1);
  billsSheet.getRange('A:A').setNumberFormat('yyyy-mm-dd');
  
  SpreadsheetApp.getUi().alert('✅ 所有工作表初始化完成！\n\n備註：日期欄位已設定為日期格式，以確保 P&L 報表能正確運作。');
}

// 輔助函數：取得或建立工作表（支援舊名稱）
function getOrCreateSheet(ss, newName, oldNames) {
  // 先嘗試用新名稱
  let sheet = ss.getSheetByName(newName);
  if (sheet) return sheet;
  
  // 嘗試用舊名稱
  for (let oldName of oldNames) {
    sheet = ss.getSheetByName(oldName);
    if (sheet) {
      // 改名為新名稱
      sheet.setName(newName);
      return sheet;
    }
  }
  
  // 都不存在，建立新的
  sheet = ss.insertSheet(newName);
  return sheet;
}

// ==========================================
// 🔄 設定公式（核心功能）
// ==========================================
// ==========================================
// 🔄 設定公式（核心功能 - 修復版）
// ==========================================
function setupFormulas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = getOrCreateSheet(ss, SHEETS.RAW_TX, ['🔴 Raw_Transactions']);
  const dailySheet = getOrCreateSheet(ss, SHEETS.DAILY_SUMMARY, ['📅 每日營收總表']);
  const expSheet = getOrCreateSheet(ss, SHEETS.EXPENSE_DETAIL, ['📋 支出紀錄明細']);
  const fixedSheet = getOrCreateSheet(ss, SHEETS.FIXED_COSTS, ['🔵 固定成本_FixedCosts']);
  const plSheet = getOrCreateSheet(ss, SHEETS.PL_STATEMENT, ['🟡 月損益表_P&L']);
  
  if (!rawSheet || !dailySheet || !expSheet || !fixedSheet || !plSheet) {
    SpreadsheetApp.getUi().alert('❌ 找不到必要的工作表！\n\n請先執行「🔧 初始化/重建所有工作表」。');
    return;
  }
  
  const rawSheetName = rawSheet.getName();
  const fixedSheetName = fixedSheet.getName();
  const dailySheetName = dailySheet.getName();
  const currentYear = new Date().getFullYear();
  
  // ==========================================
  // Daily_Summary 公式設定 (使用 MAP 解決 SUMIFS 陣列問題)
  // ==========================================
  
  // A2: 取得所有唯一日期（降序）
  // 注意：確保 Raw_Transactions 的 A 欄位格式一致
  dailySheet.getRange('A2').setFormula(
    '=QUERY(' + rawSheetName + '!A2:A, "SELECT DISTINCT Col1 WHERE Col1 IS NOT NULL ORDER BY Col1 DESC", 0)'
  );
  
  // B2: 現金營收 (排除 VOID，包含 VALID 和 CLOSED)
  dailySheet.getRange('B2').setFormula(
    '=MAP(A2:A, LAMBDA(d, IF(d="", "", SUMIFS(' + rawSheetName + '!E:E, ' + rawSheetName + '!A:A, d, ' + rawSheetName + '!C:C, "營收", ' + rawSheetName + '!D:D, "CASH", ' + rawSheetName + '!I:I, "<>VOID"))))'
  );
  
  // C2: 轉帳營收
  dailySheet.getRange('C2').setFormula(
    '=MAP(A2:A, LAMBDA(d, IF(d="", "", SUMIFS(' + rawSheetName + '!E:E, ' + rawSheetName + '!A:A, d, ' + rawSheetName + '!C:C, "營收", ' + rawSheetName + '!D:D, "TRANSFER", ' + rawSheetName + '!I:I, "<>VOID"))))'
  );
  
  // D2: LINE Pay營收
  dailySheet.getRange('D2').setFormula(
    '=MAP(A2:A, LAMBDA(d, IF(d="", "", SUMIFS(' + rawSheetName + '!E:E, ' + rawSheetName + '!A:A, d, ' + rawSheetName + '!C:C, "營收", ' + rawSheetName + '!D:D, "LINEPAY", ' + rawSheetName + '!I:I, "<>VOID"))))'
  );
  
  // E2: Google預訂營收
  dailySheet.getRange('E2').setFormula(
    '=MAP(A2:A, LAMBDA(d, IF(d="", "", SUMIFS(' + rawSheetName + '!E:E, ' + rawSheetName + '!A:A, d, ' + rawSheetName + '!C:C, "營收", ' + rawSheetName + '!D:D, "GOOGLE", ' + rawSheetName + '!I:I, "<>VOID"))))'
  );
  
  // F2: Uber營收
  dailySheet.getRange('F2').setFormula(
    '=MAP(A2:A, LAMBDA(d, IF(d="", "", SUMIFS(' + rawSheetName + '!E:E, ' + rawSheetName + '!A:A, d, ' + rawSheetName + '!C:C, "營收", ' + rawSheetName + '!D:D, "UBER", ' + rawSheetName + '!I:I, "<>VOID"))))'
  );
  
  // G2: 當日總營收（B+C+D+E+F）- 直接相加即可，ARRAYFORMULA 支援 +
  dailySheet.getRange('G2').setFormula(
    '=ARRAYFORMULA(IF(A2:A="", "", B2:B+C2:C+D2:D+E2:E+F2:F))'
  );
  
  // H2: 平台抽成費用
  dailySheet.getRange('H2').setFormula(
    '=MAP(A2:A, LAMBDA(d, IF(d="", "", SUMIFS(' + rawSheetName + '!F:F, ' + rawSheetName + '!A:A, d, ' + rawSheetName + '!C:C, "營收", ' + rawSheetName + '!I:I, "<>VOID"))))'
  );
  
  // I2: 變動支出（取絕對值）- 注意 SUMIFS 結果需加 ABS，但因為 map 逐行處理，直接用 ABS(SUMIFS(...))
  dailySheet.getRange('I2').setFormula(
    '=MAP(A2:A, LAMBDA(d, IF(d="", "", ABS(SUMIFS(' + rawSheetName + '!E:E, ' + rawSheetName + '!A:A, d, ' + rawSheetName + '!C:C, "支出", ' + rawSheetName + '!I:I, "<>VOID")))))'
  );
  
  // J2: 固定成本攤提（從 FixedCosts 抓取，按日期攤提）
  // 這裡比較複雜，保持原樣或用 map。原公式用了 YEAR(A2:A) 和 MONTH，ArrayFormula 對 YEAR/MONTH 支援度有時有問題。
  // 改用 MAP 更穩。
  dailySheet.getRange('J2').setFormula(
    '=MAP(A2:A, LAMBDA(d, IF(d="", "", IFERROR(ROUND(SUMIFS(' + fixedSheetName + '!E:E, ' + fixedSheetName + '!A:A, YEAR(d), ' + fixedSheetName + '!B:B, TEXT(MONTH(d), "00")) / DAY(EOMONTH(d, 0)), 0), 0))))'
  );
  
  // K2: 預估淨入帳（總營收 - 手續費 - 變動支出 - 固定成本）
  dailySheet.getRange('K2').setFormula(
    '=ARRAYFORMULA(IF(A2:A="", "", G2:G-H2:H-I2:I-J2:J))'
  );
  
  // ==========================================
  // Expense_Detail 公式設定 (修正：包含 CLOSED 狀態)
  // ==========================================
  
  // A2: 日期 (只要不是 VOID 就顯示，包含 VALID 和 CLOSED)
  expSheet.getRange('A2').setFormula(
    '=IFERROR(FILTER(' + rawSheetName + '!A:A, ' + rawSheetName + '!C:C="支出", ' + rawSheetName + '!I:I<>"VOID"), "")'
  );
  
  // B2: 成本屬性（固定填「變動」）
  expSheet.getRange('B2').setFormula(
    '=IFERROR(IF(A2:A="", "", "變動"), "")'
  );
  
  // C2: 支出類別（固定填「變動支出」）
  expSheet.getRange('C2').setFormula(
    '=IFERROR(IF(A2:A="", "", "變動支出"), "")'
  );
  
  // D2: 品項
  expSheet.getRange('D2').setFormula(
    '=IFERROR(FILTER(' + rawSheetName + '!D:D, ' + rawSheetName + '!C:C="支出", ' + rawSheetName + '!I:I<>"VOID"), "")'
  );
  
  // E2: 支付方式（從來源/備註取得）
  expSheet.getRange('E2').setFormula(
    '=IFERROR(FILTER(' + rawSheetName + '!H:H, ' + rawSheetName + '!C:C="支出", ' + rawSheetName + '!I:I<>"VOID"), "")'
  );
  
  // F2: 金額（取絕對值）
  expSheet.getRange('F2').setFormula(
    '=IFERROR(ABS(FILTER(' + rawSheetName + '!E:E, ' + rawSheetName + '!C:C="支出", ' + rawSheetName + '!I:I<>"VOID")), "")'
  );
  
  // G2: 備註（留空）
  expSheet.getRange('G2').setFormula(
    '=IFERROR(IF(A2:A="", "", ""), "")'
  );
  
  // ==========================================
  // 月損益表_P&L 公式設定
  // ==========================================
  
  // 月份欄位對應（B=1月, C=2月, ..., M=12月, N=年度總計）
  const monthCols = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const monthNums = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  
  // 第2行：營業額（從 Daily_Summary 的 G 欄彙總）
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '2').setFormula(
      '=SUMIFS(' + dailySheetName + '!G:G, ' + dailySheetName + '!A:A, ">="&DATE(' + currentYear + ',' + (i+1) + ',1), ' + dailySheetName + '!A:A, "<"&DATE(' + currentYear + ',' + (i+2) + ',1))'
    );
  }
  plSheet.getRange('N2').setFormula('=SUM(B2:M2)');
  
  // 第3行：平台手續費（從 Daily_Summary 的 H 欄彙總）
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '3').setFormula(
      '=SUMIFS(' + dailySheetName + '!H:H, ' + dailySheetName + '!A:A, ">="&DATE(' + currentYear + ',' + (i+1) + ',1), ' + dailySheetName + '!A:A, "<"&DATE(' + currentYear + ',' + (i+2) + ',1))'
    );
  }
  plSheet.getRange('N3').setFormula('=SUM(B3:M3)');
  
  // 第4行：實際營收（營業額 - 平台手續費）
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '4').setFormula('=' + monthCols[i] + '2-' + monthCols[i] + '3');
  }
  plSheet.getRange('N4').setFormula('=N2-N3');
  
  // 第7行：變動支出（從 Daily_Summary 的 I 欄彙總）
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '7').setFormula(
      '=SUMIFS(' + dailySheetName + '!I:I, ' + dailySheetName + '!A:A, ">="&DATE(' + currentYear + ',' + (i+1) + ',1), ' + dailySheetName + '!A:A, "<"&DATE(' + currentYear + ',' + (i+2) + ',1))'
    );
  }
  plSheet.getRange('N7').setFormula('=SUM(B7:M7)');
  
  // 第8行：營業毛利（實際營收 - 變動支出）
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '8').setFormula('=' + monthCols[i] + '4-' + monthCols[i] + '7');
  }
  plSheet.getRange('N8').setFormula('=N4-N7');
  
  // 第11行：店面租金（從 FixedCosts 抓取）
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '11').setFormula(
      '=SUMIFS(' + fixedSheetName + '!E:E, ' + fixedSheetName + '!A:A, ' + currentYear + ', ' + fixedSheetName + '!B:B, "' + monthNums[i] + '", ' + fixedSheetName + '!C:C, "租金支出")'
    );
  }
  plSheet.getRange('N11').setFormula('=SUM(B11:M11)');
  
  // 第12行：人事薪資
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '12').setFormula(
      '=SUMIFS(' + fixedSheetName + '!E:E, ' + fixedSheetName + '!A:A, ' + currentYear + ', ' + fixedSheetName + '!B:B, "' + monthNums[i] + '", ' + fixedSheetName + '!C:C, "人事支出")'
    );
  }
  plSheet.getRange('N12').setFormula('=SUM(B12:M12)');
  
  // 第13行：水電/雜支（水電費 + 電信網路）
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '13').setFormula(
      '=SUMIFS(' + fixedSheetName + '!E:E, ' + fixedSheetName + '!A:A, ' + currentYear + ', ' + fixedSheetName + '!B:B, "' + monthNums[i] + '", ' + fixedSheetName + '!C:C, "水電費")+SUMIFS(' + fixedSheetName + '!E:E, ' + fixedSheetName + '!A:A, ' + currentYear + ', ' + fixedSheetName + '!B:B, "' + monthNums[i] + '", ' + fixedSheetName + '!C:C, "電信網路")'
    );
  }
  plSheet.getRange('N13').setFormula('=SUM(B13:M13)');
  
  // 第15行：本期淨利（營業毛利 - 固定成本總和）
  for (let i = 0; i < monthCols.length; i++) {
    plSheet.getRange(monthCols[i] + '15').setFormula('=' + monthCols[i] + '8-' + monthCols[i] + '11-' + monthCols[i] + '12-' + monthCols[i] + '13');
  }
  plSheet.getRange('N15').setFormula('=N8-N11-N12-N13');
  
  SpreadsheetApp.getUi().alert('✅ 公式修復完成：\n\n1. Daily_Summary 已改用 MAP 函數，解決 #VALUE! 錯誤。\n2. Expense_Detail 已設定為顯示所有非作廢 (VOID) 交易，包含已結帳 (CLOSED) 項目。');
}

// ==========================================
// 🔄 同步功能
// ==========================================
function syncTodayNow() {
  const today = Utilities.formatDate(new Date(), CONFIG.timezone, "yyyy-MM-dd");
  logSync(`🔄 開始同步 ${today}...`, "INFO");
  try {
    runSyncForDate(today);
    logSync(`✅ 同步 ${today} 成功`, "SUCCESS");
    SpreadsheetApp.getActiveSpreadsheet().toast(`✅ 已同步 ${today} 資料`, "完成");
  } catch (e) {
    logSync(`❌ 同步失敗: ${e.toString()}`, "ERROR");
    SpreadsheetApp.getUi().alert("❌ 同步失敗：\n" + e.toString());
  }
}

function runSyncForDate(dateStr) {
  if (!CONFIG.client_email || !CONFIG.private_key || !CONFIG.project_id) {
    throw new Error("❌ 配置不完整！請先執行 setupSecrets()");
  }
  
  const token = getAccessToken();
  if (!token) {
    throw new Error("❌ 無法取得 Firebase 訪問令牌");
  }
  
  syncTransactions(token, dateStr);
  syncDailyClosings(token, dateStr);
  syncBillsHistory(token, dateStr);
}

function syncTransactions(token, dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEETS.RAW_TX, ['🔴 Raw_Transactions']);
  
  // 確保表頭存在
  if (sheet.getLastRow() === 0) {
    const rawHeaders = ['日期', '時間', '類別', '項目/支付方式', '金額', '手續費', '淨額', '來源/備註', '狀態', 'ID'];
    sheet.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
    sheet.getRange(1, 1, 1, rawHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('@');
  }

  const incomeDocs = fetchFirestoreByDate(token, "transactions", dateStr, "timestamp");
  logSync(`✓ 取得 ${incomeDocs.length} 筆營收紀錄`, "DEBUG");
  
  const incomeRows = incomeDocs.map(doc => {
    const f = doc.fields;
    const ts = parseTimestamp(f.timestamp);
    return {
      id: doc.name.split('/').pop(),
      data: [
        dateStr,
        Utilities.formatDate(ts, CONFIG.timezone, "HH:mm:ss"),
        "營收",
        getValue(f.channel),
        getValue(f.amount),
        getValue(f.fee_amount),
        getValue(f.net_amount),
        getValue(f.note) || "",
        getValue(f.status) || "VALID",
        doc.name.split('/').pop()
      ]
    };
  });

  const expenseDocs = fetchFirestoreByDate(token, "expenses", dateStr, "date");
  logSync(`✓ 取得 ${expenseDocs.length} 筆支出紀錄`, "DEBUG");
  
  const expenseRows = expenseDocs.map(doc => {
    const f = doc.fields;
    const ts = parseTimestamp(f.created_at);
    return {
      id: doc.name.split('/').pop(),
      data: [
        dateStr,
        Utilities.formatDate(ts, CONFIG.timezone, "HH:mm:ss"),
        "支出",
        getValue(f.item),
        (getValue(f.amount) || 0) * -1,
        0,
        (getValue(f.amount) || 0) * -1,
        getValue(f.source) || "",
        getValue(f.status) || "VALID",
        doc.name.split('/').pop()
      ]
    };
  });

  const allItems = [...incomeRows, ...expenseRows];
  if (allItems.length === 0) {
    logSync("⚠️ 此日期無任何交易紀錄", "WARN");
    return;
  }

  const existingIds = sheet.getRange(2, 10, Math.max(sheet.getLastRow() - 1, 0), 1).getValues().flat();
  let updated = 0, inserted = 0;
  
  allItems.forEach((item) => {
    try {
      const idx = existingIds.indexOf(item.id);
      if (idx !== -1) {
        sheet.getRange(idx + 2, 1, 1, 10).setValues([item.data]);
        sheet.getRange(idx + 2, 1).setNumberFormat('@');
        updated++;
      } else {
        const newRow = sheet.getLastRow() + 1;
        sheet.getRange(newRow, 1, 1, 10).setValues([item.data]);
        sheet.getRange(newRow, 1).setNumberFormat('@');
        inserted++;
      }
    } catch (e) {
      logSync(`❌ 處理資料失敗: ${e.toString()}`, "ERROR");
    }
  });
  
  logSync(`✓ 交易資料：更新 ${updated} 筆，新增 ${inserted} 筆`, "DEBUG");
}

function syncDailyClosings(token, dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEETS.RAW_CLOSINGS, ['🔴 Raw_DailyClosings']);
  
  // 確保表頭存在
  if (sheet.getLastRow() === 0) {
    const closingsHeaders = ['日期', '經手人', '系統應有', '實際點算', '差異', '差異原因', '今日提領', '明日保留'];
    sheet.getRange(1, 1, 1, closingsHeaders.length).setValues([closingsHeaders]);
    sheet.getRange(1, 1, 1, closingsHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('@');
  }

  const docs = fetchFirestoreByDate(token, "daily_closings", dateStr, "date");
  if (docs.length === 0) return;

  const f = docs[0].fields;
  const row = [
    dateStr,
    getValue(f.staff_name),
    getValue(f.expected_drawer),
    getValue(f.actual_counted),
    getValue(f.variance),
    getValue(f.variance_reason),
    getValue(f.cash_drop),
    getValue(f.closing_float)
  ];

  const dates = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues().flat()
    .map(d => String(d));
  const idx = dates.indexOf(dateStr);
  
  if (idx !== -1) {
    sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function syncBillsHistory(token, dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEETS.BILLS_HISTORY, ['🟣 點鈔機記錄']);
  
  // 確保表頭存在
  if (sheet.getLastRow() === 0) {
    const billsHeaders = ['日期', '時間', '1000元', '500元', '200元', '100元', '50元', '20元', '10元', '5元', '1元', '總計'];
    sheet.getRange(1, 1, 1, billsHeaders.length).setValues([billsHeaders]);
    sheet.getRange(1, 1, 1, billsHeaders.length).setFontWeight('bold').setBackground('#EFEFEF');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('@');
  }

  const docs = fetchFirestoreByDate(token, "bills_history", dateStr, "date");
  if (docs.length === 0) return;

  docs.forEach(doc => {
    const f = doc.fields;
    const billsJson = getValue(f.bills_json);
    let bills = {};
    try {
      bills = JSON.parse(billsJson);
    } catch (e) {
      bills = {};
    }

    const row = [
      getValue(f.date),
      getValue(f.time),
      bills[1000] || 0,
      bills[500] || 0,
      bills[200] || 0,
      bills[100] || 0,
      bills[50] || 0,
      bills[20] || 0,
      bills[10] || 0,
      bills[5] || 0,
      bills[1] || 0,
      getValue(f.total) || 0
    ];

    const existingRows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 2).getValues();
    const rowIdx = existingRows.findIndex((r) => String(r[0]) === String(row[0]) && String(r[1]) === String(row[1]));

    if (rowIdx !== -1) {
      sheet.getRange(rowIdx + 2, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });
}

// ==========================================
// 🔐 Token 生成
// ==========================================
function getAccessToken() {
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty('FIREBASE_ACCESS_TOKEN');
  const cachedExp = Number(props.getProperty('FIREBASE_ACCESS_TOKEN_EXP')) || 0;
  const now = Math.floor(Date.now() / 1000);

  if (cached && cachedExp - now > 60) {
    return cached;
  }

  try {
    const payload = {
      iss: CONFIG.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };
    
    const header = { alg: 'RS256', typ: 'JWT' };
    const headerB64 = Utilities.base64Encode(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payloadB64 = Utilities.base64Encode(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const token = headerB64 + '.' + payloadB64;
    const signature = Utilities.computeRsaSha256Signature(token, CONFIG.private_key);
    const signatureB64 = Utilities.base64Encode(signature).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const jwt = token + '.' + signatureB64;
    
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt },
      muteHttpExceptions: true,
      timeout: 30000
    });
    
    const result = JSON.parse(response.getContentText());
    if (result.access_token) {
      props.setProperty('FIREBASE_ACCESS_TOKEN', result.access_token);
      props.setProperty('FIREBASE_ACCESS_TOKEN_EXP', String(now + 3600));
      return result.access_token;
    }
    return null;
  } catch (e) {
    logSync(`❌ Token 獲取異常: ${e.toString()}`, "ERROR");
    return null;
  }
}

// ==========================================
// 🔍 Firestore 查詢
// ==========================================
function fetchFirestoreByDate(token, collection, dateStr, dateFieldName) {
  let structuredQuery;
  
  if (dateFieldName === 'date') {
    structuredQuery = {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'date' },
          op: 'EQUAL',
          value: { stringValue: dateStr }
        }
      }
    };
  } else {
    const dateObj = new Date(dateStr + 'T00:00:00+08:00');
    const startOfDay = new Date(dateObj.getTime());
    const endOfDay = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000);
    
    structuredQuery = {
      from: [{ collectionId: collection }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'timestamp' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: startOfDay.toISOString() }}},
            { fieldFilter: { field: { fieldPath: 'timestamp' }, op: 'LESS_THAN', value: { timestampValue: endOfDay.toISOString() }}}
          ]
        }
      }
    };
  }
  
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.project_id}/databases/(default)/documents:runQuery`;
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ structuredQuery }),
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
      timeout: 30000
    });
    
    if (response.getResponseCode() !== 200) {
      return [];
    }
    
    const raw = JSON.parse(response.getContentText());
    return raw.filter(r => r.document).map(r => r.document);
  } catch (e) {
    Logger.log('Query error: ' + e);
    return [];
  }
}

// ==========================================
// 🛠 工具函數
// ==========================================
function getValue(f) {
  if (!f) return "";
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.integerValue !== undefined) return parseInt(f.integerValue);
  if (f.doubleValue !== undefined) return parseFloat(f.doubleValue);
  return "";
}

function parseTimestamp(ts) {
  if (!ts) return new Date();
  return new Date(ts.timestampValue || ts);
}

// ==========================================
// 📊 日誌與調試
// ==========================================
function checkFirebaseConnection() {
  if (!CONFIG.client_email || !CONFIG.private_key || !CONFIG.project_id) {
    SpreadsheetApp.getUi().alert("❌ 配置不完整！\n\n請先執行「🔐 設定敏感資訊」");
    return;
  }
  
  const token = getAccessToken();
  if (!token) {
    SpreadsheetApp.getUi().alert("❌ 無法取得 Token");
    return;
  }
  
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.project_id}/databases/(default)/documents/transactions?pageSize=1`;
    const response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true,
      timeout: 30000
    });
    
    if (response.getResponseCode() === 200) {
      SpreadsheetApp.getUi().alert("✅ Firebase 連線正常");
    } else {
      SpreadsheetApp.getUi().alert("❌ 連線失敗：" + response.getResponseCode());
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ 錯誤：" + e.toString());
  }
}

function viewSyncLogs() {
  const props = PropertiesService.getScriptProperties();
  const logs = props.getProperty('syncLogs') || '無日誌';
  
  const logSheet = getOrCreateSheet(SpreadsheetApp.getActiveSpreadsheet(), SHEETS.SYNC_LOGS, ['🟠 Sync_Logs']);
  
  logSheet.clear();
  logSheet.appendRow(['時間', '等級', '訊息']);
  logSheet.setFrozenRows(1);
  
  const logLines = logs.split('\n').filter(l => l).slice(-100);
  logLines.forEach(line => {
    const match = line.match(/\[(.*?)\] \[(.*?)\] (.*)/);
    if (match) {
      logSheet.appendRow([match[1], match[2], match[3]]);
    }
  });
  
  SpreadsheetApp.getUi().alert("✅ 日誌已載入到 '" + SHEETS.SYNC_LOGS + "' 工作表");
}

function logSync(message, level = "INFO") {
  const time = Utilities.formatDate(new Date(), CONFIG.timezone, "yyyy-MM-dd HH:mm:ss");
  const logEntry = `[${time}] [${level}] ${message}`;
  
  const props = PropertiesService.getScriptProperties();
  let existingLogs = props.getProperty('syncLogs') || '';
  existingLogs += logEntry + '\n';
  
  if (existingLogs.length > 51200) {
    existingLogs = existingLogs.substring(existingLogs.length - 51200);
  }
  
  props.setProperty('syncLogs', existingLogs);
  Logger.log(logEntry);
}
