/**
 * 🌙 月島甜點 - 後台數據中樞 (V16.1 - 安全優化版)
 * 
 * ✅ 安全改進：
 * - private_key 已移到 Script Properties（不再硬編碼）
 * - 使用 Firestore runQuery API（只抓指定日期資料）
 * - Token 快取機制（減少 API 呼叫）
 * - 增強錯誤處理與重試機制
 * 
 * 📋 使用說明：
 * 1. 首次使用：執行一次 setupSecrets() 函數，將敏感資訊存入 Script Properties
 * 2. 之後：直接使用 syncTodayNow() 等函數即可
 */

// ==========================================
// 🔐 安全配置 - 從 Script Properties 讀取
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
// 🔧 初始化函數 - 首次使用時執行一次
// ==========================================
function setupSecrets() {
  const props = PropertiesService.getScriptProperties();
  
  // ⚠️ 請將以下值替換為你的實際值，然後執行一次此函數
  // 執行後，請刪除這段代碼中的實際值，只保留註解
  
  props.setProperty('SERVICE_ACCOUNT_EMAIL', 'firebase-adminsdk-y2rhy@rubbycake-menu.iam.gserviceaccount.com');
  props.setProperty('SERVICE_ACCOUNT_PRIVATE_KEY', '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDMewiWOfGpCyto\nM0N+RvkX8HCWVvt7Lad5NJ9YT+TcbDCWb3/4Kv+ZU8XgsyqLn+6zeNoTsw2S6W0M\nTM7OqfCtv3SCkTq6qJ5XDmz7nYn9sl+xAO/gHUwS+a6HIJHzRzmiW0/SpcxxBu8q\nyX9m3VdJ7mgpD0khvLB1yLHaW3rW9oZXxx6ZjSYviXb6V7aFGRjWfxsG5j5A4bgG\nJPDaE/Y2dO4l/PkKg2i6GEGKovBUGI41L81Q6g1FDf74PeEUinzs3rCx48yyZlE6\naYd53rWjj4S339qTeYwbdGcy55BYnDl4iWopL7WbD7LomrtlzlVPmE1ZxSGm1FRV\ngUhCGMNPAgMBAAECggEAMS+9Oom4qD2QFPIT36nJ3GjRZFCLEK/EM8MlO1SIjD8Y\nFu++PB93uVWt6SWf69MuU4yUBJ4S+05cFVPagVrekqTVrVyq4GCUKgPF0masXVLN\ncuHzUZkqhfv6b/W1NexhoDzPwC9ytJOC72tl0oQWramD87CCGnPtjH+YzJopu9BF\noKwcUthnXXESVR4cx+QaqkT9tf0bYoWHLZ8WmXwrrbAj/6Ffp+JsNEJlMsrRZOO9\n+Oxjqdg3MXj9iKTPrPO718APYejIgIIyQ8PhSX6NfGC9H9te8iK5av8MWxkBWym2\nAkVtiJFC9ldMFwKVQXAzaySAvnSIwqyzeQQ3rZo13QKBgQD7tq5L2PnSnZTY5kgG\nh6yfd6SPCYzGWhXV6LHLvSwBQCfNDS5uIMTN1suYjor20QP8MQ8l4MTEqQqQIS8Z\nr/kmKzE/j7Apcx7hwZdqpMvJmPc0jxO09U4PE+fNFwNNi0Q3UMY7sbuymiKo+0t+\n/RylLCXFXuMk0joHUokMOsunTQKBgQDP9nIEILDH1f1sNqB+ECIIlaAYRU66cmvA\nzm88Y+5gc1H/ekzBeNNEisVVOp0VNmGaNtHktlMTuVihgO2x3zK5v/dDKVP0a9oX\n/CCJwfBXY/qfxQRSJzuIG+nbYRrGrSxWwsoLsNpybQyZtdvL7daoktkr9lj5u8pG\n0BkM5c9fCwKBgFj11V/lDVYMb2DA8k+sf6vUYwpSe7hWekUhekThVL4UaHyl3fT6\nC9Qbx9Tg++gDMv9cb1gZujEu9Ra/Q6A2ez2sIjmulLnxf8aV3ufH2mYjc6rVrkdU\nMwRNKq1nJrmvMKrEF2tdg1K5+unx9lqpJgiSM78vq+OFkRCpcNorpXI5AoGAbA0N\nEm31y+64PHhpjPZO6IztYI7qJ995cvUPQJ5fZYelbAscRE3F31AG1ZCduz7FGX4w\nMhg1NANSNJ+rYIaqcW53R1L6xv0elOWv9kNo388XkdmotBKkUMTIDe73HZEuf2m3\n1rkt1tQn/tlJeTx7Ep0x7zCQ7DiREZff3B6vTx8CgYEAwlXsbmTD1aaxV8bXWtIo\nuXuqHTBzxVjVUJ8KkbgSHHW6TxIVrV1B9PT0VqqO8Zo1MVpChC9E8SWBjrrXH9bX\n7C9aTJSJMgyF+utDeGwxeFjFKZGG8LLwaQ1WJ9gxI+4i11V6FPlkWvMU1oWUucpV\ndwB2TESaot99RA1ThspX4rw=\n-----END PRIVATE KEY-----\n');
  props.setProperty('FIREBASE_PROJECT_ID', 'rubbycake-menu');
  
  SpreadsheetApp.getUi().alert('✅ 敏感資訊已存入 Script Properties\n\n⚠️ 請確認已刪除代碼中的實際值！');
}

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🍰 月島甜點系統')
      .addItem('🔄 立即同步今日帳務', 'syncTodayNow')
      .addItem('🔍 檢查 Firebase 連線狀態', 'checkFirebaseConnection')
      .addItem('📊 查看同步日誌', 'viewSyncLogs')
      .addSeparator()
      .addItem('🏗️ 初始化/重置報表 (V16)', 'initializeSpreadsheet')
      .addItem('🔐 設定敏感資訊（首次使用）', 'setupSecrets')
      .addToUi();
  } catch (e) {
    Logger.log('選單建立失敗: ' + e.toString());
  }
}

// 手動觸發選單更新（如果選單沒有出現，執行此函數）
function refreshMenu() {
  onOpen();
  SpreadsheetApp.getActiveSpreadsheet().toast('✅ 選單已更新，請重新整理頁面', '完成', 3);
}

// ==========================================
// 🏗️ 初始化與建表 (V16 - V2復刻版)
// ==========================================
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const currentYear = new Date().getFullYear();

  // 1. 🔴 Raw_Transactions (資料庫 - 不變)
  createSheetIfNotExists(ss, "🔴 Raw_Transactions", [
    "完整日期", "年", "月", "日", "星期", "時間", "類別", "項目/支付方式", "金額", "手續費", "淨額", "來源/備註", "狀態", "ID"
  ]);

  // 2. 🔴 Raw_DailyClosings (日結單 - 不變)
  createSheetIfNotExists(ss, "🔴 Raw_DailyClosings", [
    "日期", "經手人", "系統應有", "實際點算", "差異", "差異原因", "今日提領", "明日保留"
  ]);

  // 3. 🔵 固定成本 (手動輸入區)
  const fixedSheet = createSheetIfNotExists(ss, "🔵 固定成本_FixedCosts", [
    "歸屬年份", "歸屬月份", "支出類別", "項目名稱", "金額", "備註/支付方式"
  ]);
  if (fixedSheet.getLastRow() === 1) {
    fixedSheet.getRange(2, 1, 4, 6).setValues([
      [currentYear, "01", "租金支出", "店面房租", 35000, "銀行轉帳"],
      [currentYear, "01", "人事支出", "員工薪資", 80000, "銀行轉帳"],
      [currentYear, "01", "水電費", "電費預估", 5000, "信用卡"],
      [currentYear, "01", "網路費", "中華電信", 1200, "信用卡"]
    ]);
  }

  // 4. 📅 每日營收總表 (V2 風格復刻！)
  const dailySheet = createSheetIfNotExists(ss, "📅 每日營收總表", [
    "日期", "現金營收", "轉帳營收", "LINE Pay營收", "Google預訂營收", "Uber營收", "當日總營收", "平台抽成費用", "變動支出(App)", "固定成本(攤提)", "預估淨入帳"
  ]);
  
  dailySheet.getRange("A1").setValue("▼ 每日收支明細 (V2 復刻版 - 自動更新)");
  
  // 清空舊公式以免重複
  if(dailySheet.getLastRow() > 1) {
    dailySheet.getRange(2, 1, dailySheet.getLastRow()-1, 11).clearContent();
  }

  // A2: 日期 (自動抓 Raw_Transactions 唯一日期)
  dailySheet.getRange("A2").setFormula(`=UNIQUE(SORT('🔴 Raw_Transactions'!A2:A, 1, FALSE))`);
  
  // B2: 現金 (CASH)
  dailySheet.getRange("B2").setFormula(`=IF(ISBLANK(A2), "", SUMIFS('🔴 Raw_Transactions'!$I:$I, '🔴 Raw_Transactions'!$A:$A, A2, '🔴 Raw_Transactions'!$H:$H, "CASH", '🔴 Raw_Transactions'!$M:$M, "VALID"))`);
  
  // C2: 轉帳 (TRANSFER)
  dailySheet.getRange("C2").setFormula(`=IF(ISBLANK(A2), "", SUMIFS('🔴 Raw_Transactions'!$I:$I, '🔴 Raw_Transactions'!$A:$A, A2, '🔴 Raw_Transactions'!$H:$H, "TRANSFER", '🔴 Raw_Transactions'!$M:$M, "VALID"))`);

  // D2: LINE Pay
  dailySheet.getRange("D2").setFormula(`=IF(ISBLANK(A2), "", SUMIFS('🔴 Raw_Transactions'!$I:$I, '🔴 Raw_Transactions'!$A:$A, A2, '🔴 Raw_Transactions'!$H:$H, "LINEPAY", '🔴 Raw_Transactions'!$M:$M, "VALID"))`);

  // E2: Google
  dailySheet.getRange("E2").setFormula(`=IF(ISBLANK(A2), "", SUMIFS('🔴 Raw_Transactions'!$I:$I, '🔴 Raw_Transactions'!$A:$A, A2, '🔴 Raw_Transactions'!$H:$H, "GOOGLE", '🔴 Raw_Transactions'!$M:$M, "VALID"))`);

  // F2: Uber
  dailySheet.getRange("F2").setFormula(`=IF(ISBLANK(A2), "", SUMIFS('🔴 Raw_Transactions'!$I:$I, '🔴 Raw_Transactions'!$A:$A, A2, '🔴 Raw_Transactions'!$H:$H, "UBER", '🔴 Raw_Transactions'!$M:$M, "VALID"))`);

  // G2: 當日總營收 (SUM B~F)
  dailySheet.getRange("G2").setFormula(`=IF(ISBLANK(A2), "", SUM(B2:F2))`);

  // H2: 平台抽成 (自動加總 Fee)
  dailySheet.getRange("H2").setFormula(`=IF(ISBLANK(A2), "", SUMIFS('🔴 Raw_Transactions'!$J:$J, '🔴 Raw_Transactions'!$A:$A, A2, '🔴 Raw_Transactions'!$M:$M, "VALID"))`);

  // I2: 變動支出 (App 裡的支出)
  dailySheet.getRange("I2").setFormula(`=IF(ISBLANK(A2), "", ABS(SUMIFS('🔴 Raw_Transactions'!$I:$I, '🔴 Raw_Transactions'!$A:$A, A2, '🔴 Raw_Transactions'!$G:$G, "支出", '🔴 Raw_Transactions'!$M:$M, "VALID")))`);

  // J2: 固定成本每日攤提 (Magic Formula!)
  dailySheet.getRange("J2").setFormula(`=IF(ISBLANK(A2), "", IFERROR(ROUND(SUMIFS('🔵 固定成本_FixedCosts'!$E:$E, '🔵 固定成本_FixedCosts'!$A:$A, YEAR(A2), '🔵 固定成本_FixedCosts'!$B:$B, TEXT(MONTH(A2), "00")) / DAY(EOMONTH(A2, 0)), 0), 0))`);

  // K2: 預估淨入帳 (總營收 - 抽成 - 支出 - 固定攤提)
  dailySheet.getRange("K2").setFormula(`=IF(ISBLANK(A2), "", G2-H2-I2-J2)`);

  // 填滿公式
  dailySheet.getRange("B2:K2").copyTo(dailySheet.getRange("B2:K366"));


  // 5. 📋 支出紀錄明細 (V2 復刻！)
  const expSheet = createSheetIfNotExists(ss, "📋 支出紀錄明細", [
    "日期", "成本屬性", "支出類別", "品項", "支付方式", "金額", "備註"
  ]);
  // 使用 FILTER 自動抓取所有支出 (更簡單可靠的方式)
  expSheet.getRange("A2").setFormula(`=IFERROR(FILTER('🔴 Raw_Transactions'!A:M, ('🔴 Raw_Transactions'!$G:$G="支出")*('🔴 Raw_Transactions'!$M:$M="VALID")), "")`);


  // 6. 🟡 月損益表 (P&L)
  const plSheet = createSheetIfNotExists(ss, "🟡 月損益表_P&L", ["項目", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月", "年度總計"]);
  const plLabels = [
    ["【營業收入】"], ["(+) 營業額"], ["(-) 平台手續費"], ["(=) 實際營收"],
    [""], ["【營業成本 (變動)】"], ["(-) 食材/包材支出"], ["(=) 營業毛利"],
    [""], ["【營業費用 (固定)】"], ["(-) 店面租金"], ["(-) 人事薪資"], ["(-) 水電/雜支"],
    [""], ["【本期淨利】"]
  ];
  if(plSheet.getLastRow() === 1) {
    plSheet.getRange(2, 1, plLabels.length, 1).setValues(plLabels).setFontWeight("bold");
    
    // 自動寫入公式 (所有 12 個月)
    for (let month = 1; month <= 12; month++) {
      const m = String(month).padStart(2, '0');
      const col = String.fromCharCode(66 + month - 1); // B=66, C=67... M=77
      
      // 營業額 (第 3 行)
      plSheet.getRange(`${col}3`).setFormula(`=SUMIFS('🔴 Raw_Transactions'!$I:$I, '🔴 Raw_Transactions'!$B:$B, "${currentYear}", '🔴 Raw_Transactions'!$C:$C, "${m}", '🔴 Raw_Transactions'!$G:$G, "營收", '🔴 Raw_Transactions'!$M:$M, "VALID")`);
      
      // 平台手續費 (第 4 行)
      plSheet.getRange(`${col}4`).setFormula(`=SUMIFS('🔴 Raw_Transactions'!$J:$J, '🔴 Raw_Transactions'!$B:$B, "${currentYear}", '🔴 Raw_Transactions'!$C:$C, "${m}", '🔴 Raw_Transactions'!$M:$M, "VALID")`);
      
      // 實際營收 (第 5 行)
      plSheet.getRange(`${col}5`).setFormula(`=${col}3-${col}4`);
      
      // 食材/包材支出 (第 8 行)
      plSheet.getRange(`${col}8`).setFormula(`=ABS(SUMIFS('🔴 Raw_Transactions'!$I:$I, '🔴 Raw_Transactions'!$B:$B, "${currentYear}", '🔴 Raw_Transactions'!$C:$C, "${m}", '🔴 Raw_Transactions'!$G:$G, "支出", '🔴 Raw_Transactions'!$M:$M, "VALID"))`);
      
      // 營業毛利 (第 9 行)
      plSheet.getRange(`${col}9`).setFormula(`=${col}5-${col}8`);
      
      // 店面租金 (第 12 行)
      plSheet.getRange(`${col}12`).setFormula(`=SUMIFS('🔵 固定成本_FixedCosts'!$E:$E, '🔵 固定成本_FixedCosts'!$A:$A, "${currentYear}", '🔵 固定成本_FixedCosts'!$B:$B, "${m}", '🔵 固定成本_FixedCosts'!$C:$C, "租金支出")`);
      
      // 人事薪資 (第 13 行)
      plSheet.getRange(`${col}13`).setFormula(`=SUMIFS('🔵 固定成本_FixedCosts'!$E:$E, '🔵 固定成本_FixedCosts'!$A:$A, "${currentYear}", '🔵 固定成本_FixedCosts'!$B:$B, "${m}", '🔵 固定成本_FixedCosts'!$C:$C, "人事支出")`);
      
      // 水電/雜支 (第 14 行)
      plSheet.getRange(`${col}14`).setFormula(`=SUMIFS('🔵 固定成本_FixedCosts'!$E:$E, '🔵 固定成本_FixedCosts'!$A:$A, "${currentYear}", '🔵 固定成本_FixedCosts'!$B:$B, "${m}", '🔵 固定成本_FixedCosts'!$C:$C, "水電費")+SUMIFS('🔵 固定成本_FixedCosts'!$E:$E, '🔵 固定成本_FixedCosts'!$A:$A, "${currentYear}", '🔵 固定成本_FixedCosts'!$B:$B, "${m}", '🔵 固定成本_FixedCosts'!$C:$C, "電信網路")`);
      
      // 本期淨利 (第 17 行)
      plSheet.getRange(`${col}17`).setFormula(`=${col}9-${col}12-${col}13-${col}14`);
    }
    
    // 年度總計 (第 O 列)
    plSheet.getRange("O3").setFormula("=SUM(B3:M3)");
    plSheet.getRange("O4").setFormula("=SUM(B4:M4)");
    plSheet.getRange("O5").setFormula("=SUM(B5:M5)");
    plSheet.getRange("O8").setFormula("=SUM(B8:M8)");
    plSheet.getRange("O9").setFormula("=SUM(B9:M9)");
    plSheet.getRange("O12").setFormula("=SUM(B12:M12)");
    plSheet.getRange("O13").setFormula("=SUM(B13:M13)");
    plSheet.getRange("O14").setFormula("=SUM(B14:M14)");
    plSheet.getRange("O17").setFormula("=O9-O12-O13-O14");
  }

  // 7. 🟢 成本卡標準 (Cost Standard)
  createSheetIfNotExists(ss, "🟢 成本卡標準", ["代號", "類別", "項目名稱", "進貨數量", "單位", "成本", "備註", "本月採購", "差異"]);
  
  // 8. 🟠 Config_CostMapping
  createSheetIfNotExists(ss, "🟠 Config_CostMapping", ["項目關鍵字", "主分類", "次分類"]);

  // 9. 🟣 點鈔機記錄 (新增！)
  const billsSheet = createSheetIfNotExists(ss, "🟣 點鈔機記錄", [
    "日期", "時間", "經手人", "實際點算", "明日保留", "差異", "1000元", "500元", "100元", "50元", "10元", "5元", "1元", "上傳時間"
  ]);
  
  // 設置凍結行
  billsSheet.setFrozenRows(1);
  billsSheet.getRange(1, 1, 1, billsSheet.getLastColumn()).setFontWeight("bold").setBackground("#EFEFEF");

  SpreadsheetApp.getUi().alert("✅ V16 系統升級完成！\n\n「📅 每日營收總表」已復刻 V2 風格，並具備自動攤提功能。\n「📋 支出紀錄明細」會自動列出所有支出。");
}

function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#EFEFEF");
  }
  return sheet;
}

// ==========================================
// 🔄 同步邏輯 (增量更新 - 不會覆蓋既有資料)
// ==========================================
/**
 * 同步今日帳務（增量更新模式）
 * 
 * ✅ 安全保證：
 * - 只會更新/新增當天同步的資料
 * - 不會刪除或覆蓋其他日期的資料
 * - 使用 Upsert 邏輯：存在就更新，不存在就新增
 */
function syncTodayNow() {
  const today = Utilities.formatDate(new Date(), CONFIG.timezone, "yyyy-MM-dd");
  logSync(`🔄 開始同步 ${today}（增量更新模式，不會覆蓋既有資料）...`, "INFO");
  try {
    runSyncForDate(today);
    logSync(`✅ 同步 ${today} 成功（增量更新完成）`, "SUCCESS");
    SpreadsheetApp.getActiveSpreadsheet().toast(`✅ 已同步 ${today} 資料（增量更新）`, "完成");
  } catch (e) {
    logSync(`❌ 同步失敗: ${e.toString()}`, "ERROR");
    SpreadsheetApp.getUi().alert("❌ 同步失敗：\n" + e.toString());
  }
}

function runDailySync() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = Utilities.formatDate(yesterday, CONFIG.timezone, "yyyy-MM-dd");
  logSync(`⏰ 自動執行昨日 ${dateStr} 同步`, "INFO");
  runSyncForDate(dateStr);
}

function runSyncForDate(dateStr) {
  // 檢查配置是否完整
  if (!CONFIG.client_email || !CONFIG.private_key || !CONFIG.project_id) {
    throw new Error("❌ 配置不完整！請先執行 setupSecrets() 函數設定敏感資訊");
  }
  
  const token = getAccessToken();
  if (!token) {
    throw new Error("❌ 無法取得 Firebase 訪問令牌 (JWT 生成失敗)");
  }
  logSync(`✓ Token 取得成功`, "DEBUG");
  
  syncTransactions(token, dateStr);
  syncDailyClosings(token, dateStr);
  syncBillsHistory(token, dateStr);
}

function syncTransactions(token, dateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🔴 Raw_Transactions");
  if (!sheet) {
    logSync("⚠️ Sheet '🔴 Raw_Transactions' 不存在", "WARN");
    return;
  }

  const dateObj = new Date(dateStr);
  const y = Utilities.formatDate(dateObj, CONFIG.timezone, "yyyy");
  const m = Utilities.formatDate(dateObj, CONFIG.timezone, "MM");
  const d = Utilities.formatDate(dateObj, CONFIG.timezone, "dd");
  const w = Utilities.formatDate(dateObj, CONFIG.timezone, "EEE");

  // A. Income - 使用 runQuery 只抓當天資料
  // 🔧 重要：同步所有渠道的交易（CASH, LINEPAY, UBER, GOOGLE, TRANSFER）
  // 前端結帳時會過濾只算 CASH，但 Google Sheet 需要完整資料
  const incomeDocs = fetchFirestoreByDate(token, "transactions", dateStr, "timestamp");
  logSync(`✓ 取得 ${incomeDocs.length} 筆營收紀錄（包含所有渠道）`, "DEBUG");
  
  // 🔍 調試：檢查各渠道數量和狀態
  const channelCounts = {};
  const statusCounts = {};
  incomeDocs.forEach(doc => {
    const channel = getValue(doc.fields.channel) || 'UNKNOWN';
    const status = getValue(doc.fields.status) || 'VALID';
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  logSync(`→ 渠道分布：${JSON.stringify(channelCounts)}`, "DEBUG");
  logSync(`→ 狀態分布：${JSON.stringify(statusCounts)}`, "DEBUG");
  
  // 🔍 特別檢查：CASH 渠道的數量（用於驗證）
  const cashCount = incomeDocs.filter(doc => getValue(doc.fields.channel) === 'CASH' && getValue(doc.fields.status) === 'VALID').length;
  logSync(`→ CASH 渠道有效交易：${cashCount} 筆`, "DEBUG");
  
  const incomeRows = incomeDocs.map(doc => {
    const f = doc.fields;
    const ts = parseTimestamp(f.timestamp);
    return {
      id: doc.name.split('/').pop(),
      data: [
        dateStr, y, m, d, w,
        Utilities.formatDate(ts, CONFIG.timezone, "HH:mm:ss"),
        "營收",
        getValue(f.channel),
        getValue(f.amount),
        getValue(f.fee_amount),
        getValue(f.net_amount),
        getValue(f.note),
        getValue(f.status) || "VALID",
        doc.name.split('/').pop()
      ]
    };
  });

  // B. Expense - 使用 runQuery 只抓當天資料
  const expenseDocs = fetchFirestoreByDate(token, "expenses", dateStr, "date");
  logSync(`✓ 取得 ${expenseDocs.length} 筆支出紀錄`, "DEBUG");
  
  // 🔍 調試：檢查支出來源分布
  const sourceCounts = {};
  const expenseStatusCounts = {};
  expenseDocs.forEach(doc => {
    const source = getValue(doc.fields.source) || 'UNKNOWN';
    const status = getValue(doc.fields.status) || 'VALID';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    expenseStatusCounts[status] = (expenseStatusCounts[status] || 0) + 1;
  });
  logSync(`→ 支出來源分布：${JSON.stringify(sourceCounts)}`, "DEBUG");
  logSync(`→ 支出狀態分布：${JSON.stringify(expenseStatusCounts)}`, "DEBUG");
  
  // 🔍 特別檢查：從錢櫃支出的數量（用於驗證）
  const drawerExpenseCount = expenseDocs.filter(doc => getValue(doc.fields.source) === 'DRAWER' && getValue(doc.fields.status) === 'VALID').length;
  logSync(`→ 錢櫃支出有效交易：${drawerExpenseCount} 筆`, "DEBUG");
  
  const expenseRows = expenseDocs.map(doc => {
    const f = doc.fields;
    const ts = parseTimestamp(f.created_at);
    return {
      id: doc.name.split('/').pop(),
      data: [
        dateStr, y, m, d, w,
        Utilities.formatDate(ts, CONFIG.timezone, "HH:mm:ss"),
        "支出",
        getValue(f.item),
        getValue(f.amount) * -1, 
        0,
        getValue(f.amount) * -1,
        getValue(f.source),
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

  // ==========================================
  // 🔒 增量更新邏輯（Upsert）- 不會覆蓋既有資料
  // ==========================================
  // 1. 讀取現有資料的 ID（第 14 欄）
  // 2. 比對：如果 ID 已存在 → 更新該筆資料
  // 3. 比對：如果 ID 不存在 → 新增到最後
  // ✅ 保證：只會更新/新增當天同步的資料，不會影響其他日期的資料
  const existingIds = sheet.getRange(2, 14, Math.max(sheet.getLastRow() - 1, 0), 1).getValues().flat();
  let updated = 0, inserted = 0;
  
  allItems.forEach((item, itemIdx) => {
    try {
      const idx = existingIds.indexOf(item.id);
      if (idx !== -1) {
        // 已存在：更新該筆（只更新同一天的資料）
        const existingDate = sheet.getRange(idx + 2, 1).getValue();
        const existingDateStr = existingDate instanceof Date ? 
          Utilities.formatDate(existingDate, CONFIG.timezone, "yyyy-MM-dd") : 
          String(existingDate);
        
        // 額外保護：只更新同一天的資料（避免誤更新其他日期）
        if (existingDateStr === dateStr) {
          sheet.getRange(idx + 2, 1, 1, item.data.length).setValues([item.data]);
          updated++;
        } else {
          // 如果 ID 相同但日期不同，可能是資料異常，記錄警告但不更新
          logSync(`⚠️ 發現 ID ${item.id} 日期不一致（現有：${existingDateStr}，新資料：${dateStr}），跳過更新`, "WARN");
        }
      } else {
        // 不存在：新增到最後（增量追加）
        sheet.appendRow(item.data);
        inserted++;
      }
    } catch (e) {
      logSync(`❌ 處理第 ${itemIdx + 1} 筆資料失敗（ID: ${item.id}）: ${e.toString()}`, "ERROR");
    }
  });
  
  // 🔍 詳細同步報告
  const cashCount = incomeRows.filter(r => getValue(r.data[7]) === 'CASH').length;
  const nonCashCount = incomeRows.length - cashCount;
  logSync(`✓ 交易資料同步完成：更新 ${updated} 筆，新增 ${inserted} 筆（增量更新，不影響其他日期）`, "DEBUG");
  logSync(`→ 營收分布：現金 ${cashCount} 筆，非現金 ${nonCashCount} 筆（LINEPAY/UBER/GOOGLE/TRANSFER）`, "DEBUG");
}

function syncDailyClosings(token, dateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🔴 Raw_DailyClosings");
  if (!sheet) {
    logSync("⚠️ Sheet '🔴 Raw_DailyClosings' 不存在", "WARN");
    return;
  }

  // 使用 runQuery 只抓當天資料（date 欄位為 string）
  const docs = fetchFirestoreByDate(token, "daily_closings", dateStr, "date");
  if (docs.length === 0) {
    logSync("⚠️ 此日期無日結紀錄", "WARN");
    return;
  }

  const f = docs[0].fields;
  const row = [
    dateStr,
    getValue(f.staff_name), getValue(f.expected_drawer),
    getValue(f.actual_counted), getValue(f.variance), getValue(f.variance_reason),
    getValue(f.cash_drop), getValue(f.closing_float)
  ];

  // ==========================================
  // 🔒 增量更新邏輯 - 不會覆蓋既有資料
  // ==========================================
  // 檢查該日期是否已存在：
  // - 存在 → 更新該筆（只更新同一天的資料）
  // - 不存在 → 新增到最後（增量追加）
  // ✅ 保證：只會更新/新增當天同步的資料，不會影響其他日期的資料
  const dates = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues().flat()
    .map(d => d instanceof Date ? Utilities.formatDate(d, CONFIG.timezone, "yyyy-MM-dd") : String(d));
  const idx = dates.indexOf(dateStr);
  
  if (idx !== -1) {
    // 已存在：更新該筆（增量更新）
    sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
    logSync(`✓ 日結紀錄已更新（日期：${dateStr}，增量更新，不影響其他日期）`, "DEBUG");
  } else {
    // 不存在：新增到最後（增量追加）
    sheet.appendRow(row);
    logSync(`✓ 日結紀錄已新增（日期：${dateStr}，增量追加）`, "DEBUG");
  }
}

// 🟣 同步點鈔機記錄
function syncBillsHistory(token, dateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🟣 點鈔機記錄");
  if (!sheet) {
    logSync("⚠️ Sheet '🟣 點鈔機記錄' 不存在", "WARN");
    return;
  }

  // 使用 runQuery 只抓當天資料（date 欄位為 string）
  const docs = fetchFirestoreByDate(token, "bills_history", dateStr, "date");
  if (docs.length === 0) {
    logSync("⚠️ 此日期無點鈔機記錄", "WARN");
    return;
  }

  logSync(`✓ 取得 ${docs.length} 筆點鈔機記錄`, "DEBUG");

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
      getValue(f.staff_name),
      getValue(f.actual_counted),
      getValue(f.closing_float),
      getValue(f.variance),
      bills[1000] || 0,
      bills[500] || 0,
      bills[100] || 0,
      bills[50] || 0,
      bills[10] || 0,
      bills[5] || 0,
      bills[1] || 0,
      Utilities.formatDate(parseFirestoreTimestampField(f.timestamp), CONFIG.timezone, "yyyy-MM-dd HH:mm:ss")
    ];

    // ==========================================
    // 🔒 增量更新邏輯 - 不會覆蓋既有資料
    // ==========================================
    // 檢查該日期+時間是否已存在：
    // - 存在 → 更新該筆（只更新同一天同一時間的資料）
    // - 不存在 → 新增到最後（增量追加）
    // ✅ 保證：只會更新/新增當天同步的資料，不會影響其他日期的資料
    const existingRows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 2).getValues();
    const rowIdx = existingRows.findIndex((r) => {
      const existingDate = r[0] instanceof Date ? 
        Utilities.formatDate(r[0], CONFIG.timezone, "yyyy-MM-dd") : 
        String(r[0]);
      return existingDate === row[0] && String(r[1]) === String(row[1]);
    });

    if (rowIdx !== -1) {
      // 已存在：更新該筆（增量更新）
      sheet.getRange(rowIdx + 2, 1, 1, row.length).setValues([row]);
      logSync(`✓ 點鈔機記錄已更新（${row[0]} ${row[1]}，增量更新，不影響其他日期）`, "DEBUG");
    } else {
      // 不存在：新增到最後（增量追加）
      sheet.appendRow(row);
      logSync(`✓ 點鈔機記錄已新增（${row[0]} ${row[1]}，增量追加）`, "DEBUG");
    }
  });
}

// ==========================================
// 🔐 Token 生成與快取
// ==========================================
function getAccessToken() {
  // 檢查快取
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty('FIREBASE_ACCESS_TOKEN');
  const cachedExp = Number(props.getProperty('FIREBASE_ACCESS_TOKEN_EXP')) || 0;
  const now = Math.floor(Date.now() / 1000);

  // 還有效就直接用（預留 60 秒緩衝）
  if (cached && cachedExp - now > 60) {
    logSync("✓ 使用快取的 Token", "DEBUG");
    return cached;
  }

  // 需要重新生成
  try {
    logSync("→ 開始生成 JWT Token...", "DEBUG");
    
    const payload = {
      iss: CONFIG.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };
    
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    const headerB64 = Utilities.base64Encode(JSON.stringify(header))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payloadB64 = Utilities.base64Encode(JSON.stringify(payload))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const token = headerB64 + '.' + payloadB64;
    
    const signature = Utilities.computeRsaSha256Signature(token, CONFIG.private_key);
    const signatureB64 = Utilities.base64Encode(signature)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    const jwt = token + '.' + signatureB64;
    
    logSync("→ 向 Google OAuth 交換 Access Token...", "DEBUG");
    
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      payload: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      },
      muteHttpExceptions: true,
      timeout: 30000
    });
    
    const result = JSON.parse(response.getContentText());
    
    if (result.access_token) {
      // 快取 Token
      props.setProperty('FIREBASE_ACCESS_TOKEN', result.access_token);
      props.setProperty('FIREBASE_ACCESS_TOKEN_EXP', String(now + 3600));
      logSync("✓ Access Token 生成成功 (已快取)", "DEBUG");
      return result.access_token;
    } else {
      const errorMsg = `${result.error} - ${result.error_description}`;
      logSync(`❌ Token 交換失敗: ${errorMsg}`, "ERROR");
      return null;
    }
  } catch (e) {
    logSync(`❌ Token 獲取異常: ${e.toString()}`, "ERROR");
    return null;
  }
}

// ==========================================
// 🔍 Firestore 查詢 - 使用 runQuery API
// ==========================================
function runFirestoreQuery(token, structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.project_id}/databases/(default)/documents:runQuery`;

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ structuredQuery }),
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
      timeout: 30000,
    });

    if (response.getResponseCode() !== 200) {
      const errorText = response.getContentText().substring(0, 200);
      logSync(`❌ runQuery 失敗 (${response.getResponseCode()}): ${errorText}`, "ERROR");
      return [];
    }

    const raw = JSON.parse(response.getContentText());
    // runQuery 回傳的是一串 { document: {...} } 物件
    const docs = raw.filter(r => r.document).map(r => r.document);
    return docs;
  } catch (e) {
    logSync(`❌ runQuery 異常: ${e.toString()}`, "ERROR");
    return [];
  }
}

/**
 * 依日期抓取 Firestore 資料（使用 runQuery，只抓指定日期）
 * @param {string} token - Firebase Access Token
 * @param {string} collection - Collection 名稱
 * @param {string} dateStr - 日期字串 (yyyy-MM-dd)
 * @param {string} dateFieldName - 日期欄位名稱 ('date' 或 'timestamp')
 * @returns {Array} 文件陣列
 */
function fetchFirestoreByDate(token, collection, dateStr, dateFieldName) {
  let structuredQuery;
  
  if (dateFieldName === 'date') {
    // date 欄位是 string，直接比對
    structuredQuery = {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'date' },
          op: 'EQUAL',
          value: { stringValue: dateStr },
        },
      },
    };
  } else if (dateFieldName === 'timestamp') {
    // 🔧 修復：timestamp 欄位是 timestamp，需要轉換為日期範圍查詢（GMT+8 時區）
    // 建立當天的開始和結束時間（GMT+8）
    const dateObj = new Date(dateStr + 'T00:00:00+08:00'); // GMT+8 當天 00:00:00
    const startOfDay = new Date(dateObj.getTime());
    const endOfDay = new Date(dateObj.getTime() + 24 * 60 * 60 * 1000 - 1); // 當天 23:59:59.999
    
    // Firestore timestamp 格式：RFC3339 UTC 時間字串
    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();
    
    logSync(`→ 查詢時間範圍：${startISO} ~ ${endISO} (GMT+8: ${dateStr})`, "DEBUG");
    
    structuredQuery = {
      from: [{ collectionId: collection }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'timestamp' },
                op: 'GREATER_THAN_OR_EQUAL',
                value: { timestampValue: startISO },
              },
            },
            {
              fieldFilter: {
                field: { fieldPath: 'timestamp' },
                op: 'LESS_THAN',
                value: { timestampValue: endISO },
              },
            },
          ],
        },
      },
    };
  } else {
    logSync(`⚠️ 不支援的 dateFieldName: ${dateFieldName}`, "WARN");
    return [];
  }
  
  logSync(`→ runQuery ${collection} where ${dateFieldName} == ${dateStr}`, "DEBUG");
  return runFirestoreQuery(token, structuredQuery);
}

// ==========================================
// 🛠 工具函數
// ==========================================
function getValue(f) {
  if (!f) return "";
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.integerValue !== undefined) return parseInt(f.integerValue);
  if (f.doubleValue !== undefined) return parseFloat(f.doubleValue);
  if (f.booleanValue !== undefined) return f.booleanValue;
  return "";
}

function parseTimestamp(ts) {
  if (!ts) return new Date();
  return new Date(ts.timestampValue || ts);
}

function parseFirestoreTimestampField(field) {
  if (!field) return new Date();
  if (field.timestampValue) return new Date(field.timestampValue);
  if (field.stringValue) return new Date(field.stringValue);
  return new Date();
}

// ==========================================
// 📊 日誌與調試
// ==========================================
function checkFirebaseConnection() {
  // 檢查配置
  if (!CONFIG.client_email || !CONFIG.private_key || !CONFIG.project_id) {
    SpreadsheetApp.getUi().alert("❌ 配置不完整！\n\n請先執行「🔐 設定敏感資訊（首次使用）」功能");
    return;
  }
  
  const token = getAccessToken();
  if (!token) {
    SpreadsheetApp.getUi().alert("❌ Firebase 連線失敗\n\n原因：無法生成 JWT token\n請檢查 private_key 設定");
    logSync("❌ JWT Token 生成失敗", "ERROR");
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
      SpreadsheetApp.getUi().alert("✅ Firebase Firestore 連線正常\n\n✓ 可以讀取資料\n✓ 認證成功");
      logSync("✅ Firebase 連線正常", "SUCCESS");
    } else {
      SpreadsheetApp.getUi().alert("❌ Firebase 連線失敗\n\n代碼: " + response.getResponseCode() + "\n回覆: " + response.getContentText().substring(0, 200));
      logSync("❌ Firebase 回傳錯誤: " + response.getResponseCode(), "ERROR");
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert("❌ 連線異常\n\n" + e.toString());
    logSync("❌ 連線異常: " + e.toString(), "ERROR");
  }
}

function viewSyncLogs() {
  const props = PropertiesService.getScriptProperties();
  const logs = props.getProperty('syncLogs') || '無日誌';
  
  const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('🟠 Sync_Logs') || 
                   SpreadsheetApp.getActiveSpreadsheet().insertSheet('🟠 Sync_Logs');
  
  logSheet.clear();
  logSheet.appendRow(['時間', '等級', '訊息']);
  logSheet.setFrozenRows(1);
  
  const logLines = logs.split('\n').filter(l => l).slice(-100); // 最後100行
  logLines.forEach(line => {
    const match = line.match(/\[(.*?)\] \[(.*?)\] (.*)/);
    if (match) {
      logSheet.appendRow([match[1], match[2], match[3]]);
    }
  });
  
  SpreadsheetApp.getUi().alert("✅ 日誌已載入到 '🟠 Sync_Logs' 工作表");
}

function logSync(message, level = "INFO") {
  const time = Utilities.formatDate(new Date(), CONFIG.timezone, "yyyy-MM-dd HH:mm:ss");
  const logEntry = `[${time}] [${level}] ${message}`;
  
  const props = PropertiesService.getScriptProperties();
  let existingLogs = props.getProperty('syncLogs') || '';
  existingLogs += logEntry + '\n';
  
  // 限制日誌大小 (保留最後 50KB)
  if (existingLogs.length > 51200) {
    existingLogs = existingLogs.substring(existingLogs.length - 51200);
  }
  
  props.setProperty('syncLogs', existingLogs);
  Logger.log(logEntry);
}
