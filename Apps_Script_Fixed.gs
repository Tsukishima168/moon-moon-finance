/**
 * 🌙 月島甜點 - 後台數據中樞 (V16.0 - V2完美復刻版)
 * 修正版本：相容 OAuth2 v43 或直接 REST API
 */

const CONFIG = {
  client_email: "firebase-adminsdk-y2rhy@rubbycake-menu.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDMewiWOfGpCyto\nM0N+RvkX8HCWVvt7Lad5NJ9YT+TcbDCWb3/4Kv+ZU8XgsyqLn+6zeNoTsw2S6W0M\nTM7OqfCtv3SCkTq6qJ5XDmz7nYn9sl+xAO/gHUwS+a6HIJHzRzmiW0/SpcxxBu8q\nyX9m3VdJ7mgpD0khvLB1yLHaW3rW9oZXxx6ZjSYviXb6V7aFGRjWfxsG5j5A4bgG\nJPDaE/Y2dO4l/PkKg2i6GEGKovBUGI41L81Q6g1FDf74PeEUinzs3rCx48yyZlE6\naYd53rWjj4S339qTeYwbdGcy55BYnDl4iWopL7WbD7LomrtlzlVPmE1ZxSGm1FRV\ngUhCGMNPAgMBAAECggEAMS+9Oom4qD2QFPIT36nJ3GjRZFCLEK/EM8MlO1SIjD8Y\nFu++PB93uVWt6SWf69MuU4yUBJ4S+05cFVPagVrekqTVrVyq4GCUKgPF0masXVLN\ncuHzUZkqhfv6b/W1NexhoDzPwC9ytJOC72tl0oQWramD87CCGnPtjH+YzJopu9BF\noKwcUthnXXESVR4cx+QaqkT9tf0bYoWHLZ8WmXwrrbAj/6Ffp+JsNEJlMsrRZOO9\n+Oxjqdg3MXj9iKTPrPO718APYejIgIIyQ8PhSX6NfGC9H9te8iK5av8MWxkBWym2\nAkVtiJFC9ldMFwKVQXAzaySAvnSIwqyzeQQ3rZo13QKBgQD7tq5L2PnSnZTY5kgG\nh6yfd6SPCYzGWhXV6LHLvSwBQCfNDS5uIMTN1suYjor20QP8MQ8l4MTEqQqQIS8Z\nr/kmKzE/j7Apcx7hwZdqpMvJmPc0jxO09U4PE+fNFwNNi0Q3UMY7sbuymiKo+0t+\n/RylLCXFXuMk0joHUokMOsunTQKBgQDP9nIEILDH1f1sNqB+ECIIlaAYRU66cmvA\nzm88Y+5gc1H/ekzBeNNEisVVOp0VNmGaNtHktlMTuVihgO2x3zK5v/dDKVP0a9oX\n/CCJwfBXY/qfxQRSJzuIG+nbYRrGrSxWwsoLsNpybQyZtdvL7daoktkr9lj5u8pG\n0BkM5c9fCwKBgFj11V/lDVYMb2DA8k+sf6vUYwpSe7hWekUhekThVL4UaHyl3fT6\nC9Qbx9Tg++gDMv9cb1gZujEu9Ra/Q6A2ez2sIjmulLnxf8aV3ufH2mYjc6rVrkdU\nMwRNKq1nJrmvMKrEF2tdg1K5+unx9lqpJgiSM78vq+OFkRCpcNorpXI5AoGAbA0N\nEm31y+64PHhpjPZO6IztYI7qJ995cvUPQJ5fZYelbAscRE3F31AG1ZCduz7FGX4w\nMhg1NANSNJ+rYIaqcW53R1L6xv0elOWv9kNo388XkdmotBKkUMTIDe73HZEuf2m3\n1rkt1tQn/tlJeTx7Ep0x7zCQ7DiREZff3B6vTx8CgYEAwlXsbmTD1aaxV8bXWtIo\nuXuqHTBzxVjVUJ8KkbgSHHW6TxIVrV1B9PT0VqqO8Zo1MVpChC9E8SWBjrrXH9bX\n7C9aTJSJMgyF+utDeGwxeFjFKZGG8LLwaQ1WJ9gxI+4i11V6FPlkWvMU1oWUucpV\ndwB2TESaot99RA1ThspX4rw=\n-----END PRIVATE KEY-----\n",
  project_id: "rubbycake-menu",
  timezone: "GMT+8"
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🍰 月島甜點系統')
    .addItem('🔄 立即同步今日帳務', 'syncTodayNow')
    .addItem('🔍 檢查 Firebase 連線狀態', 'checkFirebaseConnection')
    .addItem('📊 查看同步日誌', 'viewSyncLogs')
    .addSeparator()
    .addItem('🏗️ 初始化/重置報表 (V16)', 'initializeSpreadsheet')
    .addToUi();
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
// 🔄 功能 2：同步邏輯 (支援資料更新)
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

function runDailySync() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = Utilities.formatDate(yesterday, CONFIG.timezone, "yyyy-MM-dd");
  logSync(`⏰ 自動執行昨日 ${dateStr} 同步`, "INFO");
  runSyncForDate(dateStr);
}

function runSyncForDate(dateStr) {
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

  // A. Income
  const incomeDocs = fetchFirestoreByDate(token, "transactions", dateStr);
  logSync(`✓ 取得 ${incomeDocs.length} 筆營收紀錄`, "DEBUG");
  
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

  // B. Expense
  const expenseDocs = fetchFirestoreByDate(token, "expenses", dateStr);
  logSync(`✓ 取得 ${expenseDocs.length} 筆支出紀錄`, "DEBUG");
  
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

  // Upsert Logic
  const existingIds = sheet.getRange(2, 14, Math.max(sheet.getLastRow() - 1, 0), 1).getValues().flat();
  let updated = 0, inserted = 0;
  
  allItems.forEach(item => {
    const idx = existingIds.indexOf(item.id);
    if (idx !== -1) {
      sheet.getRange(idx + 2, 1, 1, item.data.length).setValues([item.data]);
      updated++;
    } else {
      sheet.appendRow(item.data);
      inserted++;
    }
  });
  
  logSync(`✓ 交易資料：更新 ${updated} 筆，新增 ${inserted} 筆`, "DEBUG");
}

function syncDailyClosings(token, dateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🔴 Raw_DailyClosings");
  if (!sheet) {
    logSync("⚠️ Sheet '🔴 Raw_DailyClosings' 不存在", "WARN");
    return;
  }

  const docs = fetchFirestoreByDate(token, "daily_closings", dateStr, true);
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

  const dates = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues().flat()
    .map(d => d instanceof Date ? Utilities.formatDate(d, CONFIG.timezone, "yyyy-MM-dd") : d);
  const idx = dates.indexOf(dateStr);
  
  if (idx !== -1) {
    sheet.getRange(idx + 2, 1, 1, row.length).setValues([row]);
    logSync("✓ 日結紀錄已更新", "DEBUG");
  } else {
    sheet.appendRow(row);
    logSync("✓ 日結紀錄已新增", "DEBUG");
  }
}

// 🟣 同步點鈔機記錄 (新增！)
function syncBillsHistory(token, dateStr) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🟣 點鈔機記錄");
  if (!sheet) {
    logSync("⚠️ Sheet '🟣 點鈔機記錄' 不存在", "WARN");
    return;
  }

  const docs = fetchFirestoreByDate(token, "bills_history", dateStr, true);
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
      Utilities.formatDate(new Date(getValue(f.timestamp)), CONFIG.timezone, "yyyy-MM-dd HH:mm:ss")
    ];

    // 檢查是否已存在
    const existingRows = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 2).getValues();
    const rowIdx = existingRows.findIndex((r) => r[0] === row[0] && r[1] === row[1]);

    if (rowIdx !== -1) {
      sheet.getRange(rowIdx + 2, 1, 1, row.length).setValues([row]);
      logSync("✓ 點鈔機記錄已更新", "DEBUG");
    } else {
      sheet.appendRow(row);
      logSync("✓ 點鈔機記錄已新增", "DEBUG");
    }
  });
}

// ==========================================
// 🛠 Firestore 工具函數 (REST API 直接調用)
// ==========================================

// 🔍 檢查 Firebase 連線狀態
function checkFirebaseConnection() {
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
      muteHttpExceptions: true
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

// 📊 查看同步日誌
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

// 📝 記錄同步日誌
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

function getAccessToken() {
  try {
    logSync("→ 開始生成 JWT Token...", "DEBUG");
    
    const payload = {
      iss: CONFIG.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    const token = Utilities.base64Encode(JSON.stringify(header)) + '.' + Utilities.base64Encode(JSON.stringify(payload));
    const signature = Utilities.computeRsaSha256Signature(token, CONFIG.private_key);
    const jwt = token + '.' + Utilities.base64Encode(signature).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    logSync("→ 向 Google OAuth 交換 Access Token...", "DEBUG");
    
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
      method: 'post',
      payload: {
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      },
      muteHttpExceptions: true
    });
    
    const result = JSON.parse(response.getContentText());
    
    if (result.access_token) {
      logSync("✓ Access Token 生成成功", "DEBUG");
      return result.access_token;
    } else {
      logSync(`❌ Token 交換失敗: ${result.error} - ${result.error_description}`, "ERROR");
      return null;
    }
  } catch (e) {
    logSync('❌ Token 獲取異常: ' + e.toString(), "ERROR");
    return null;
  }
}

function fetchFirestoreCollection(token, collection) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.project_id}/databases/(default)/documents/${collection}?pageSize=300`;
    logSync(`→ 讀取 collection: ${collection}`, "DEBUG");
    
    const response = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      logSync(`❌ API 錯誤 (${response.getResponseCode()}): ${response.getContentText().substring(0, 100)}`, "ERROR");
      return [];
    }
    
    const data = JSON.parse(response.getContentText());
    return data.documents || [];
  } catch(e) {
    logSync('❌ Collection 讀取失敗: ' + e.toString(), "ERROR");
    return [];
  }
}

function fetchFirestoreByDate(token, collection, dateStr, isStr = false) {
  const docs = fetchFirestoreCollection(token, collection);
  return docs.filter(doc => {
    if (isStr) {
      return doc.fields.date && doc.fields.date.stringValue === dateStr;
    }
    const ts = doc.fields.timestamp || doc.fields.created_at;
    if (!ts) return false;
    const dateMs = ts.timestampValue ? new Date(ts.timestampValue).toISOString().split('T')[0] : '';
    return dateMs === dateStr;
  });
}

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

function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, CONFIG.timezone, "yyyy-MM-dd");
}
