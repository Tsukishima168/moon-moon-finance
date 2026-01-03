# ✅ 點鈔機歷史系統 - 實施檢查清單

## 📦 已實現的功能

### 前台（React App）✅
- [x] 點鈔機自動保存到 `localStorage` (billsBackup)
- [x] 完整的點鈔機歷史紀錄保存 (billsHistory)
- [x] 「📊 查看點鈔機歷史」頁面
  - [x] 顯示所有歷史記錄（最新在上）
  - [x] 展開查看詳細鈔票組成
  - [x] 顯示點鈔時間、經手人、金額
  - [x] 同步狀態指示（黃點/綠點）
- [x] 「📤 上傳 Google Sheet」按鈕
  - [x] 上傳到 Firebase `bills_history` collection
  - [x] 更新本地記錄為「已同步」
  - [x] 顯示同步成功/失敗訊息
- [x] 「🗑️ 刪除」按鈕
  - [x] 確認對話框防誤刪
  - [x] 刪除本地記錄
  - [x] 同步本地 localStorage
- [x] 日結完成後自動保存點鈔紀錄
- [x] 錯誤處理和用戶提示

### 後台（Google Apps Script）✅
- [x] 新建「🟣 點鈔機記錄」工作表
  - [x] 14 個欄位（日期、時間、經手人、各面額等）
  - [x] 凍結標題行
- [x] `syncBillsHistory()` 同步函數
  - [x] 從 Firebase 讀取 bills_history
  - [x] 解析 JSON 格式的鈔票數據
  - [x] 更新或新增記錄（Upsert）
  - [x] 詳細日誌記錄
- [x] 集成到 `runSyncForDate()` 流程
- [x] 完整的日誌和錯誤追蹤

### 數據模型✅
- [x] Firebase collection: `bills_history`
- [x] 字段：date, time, staff_name, actual_counted, closing_float, variance, bills_json, timestamp
- [x] localStorage: `billsHistory` 數組格式
- [x] Google Sheet 14 欄位對應

---

## 🚀 部署步驟

### 1️⃣ 更新 React App
```bash
# 已修改的文件
src/App.tsx
  ✅ ClosingWizard 添加 saveBillsHistory()
  ✅ BillsHistoryView 新組件（完整功能）
  ✅ Dashboard 添加點鈔機歷史按鈕
  ✅ App Shell 添加路由
```

**驗證：**
```
npm run dev
打開 http://localhost:5173
→ Dashboard 應該看到新按鈕「📊 查看點鈔機歷史」
```

### 2️⃣ 更新 Google Apps Script
```javascript
// 已修改的文件
Apps_Script_Fixed.gs
  ✅ initializeSpreadsheet() 添加 🟣 點鈔機記錄 工作表
  ✅ runSyncForDate() 調用 syncBillsHistory()
  ✅ syncBillsHistory() 新函數
```

**部署：**
1. Google Sheet → 擴充功能 → Apps Script
2. 將所有代碼替換為 Apps_Script_Fixed.gs
3. 存檔
4. 刷新 Google Sheet
5. 點「🍰 月島甜點系統」→ 菜單應該有更新

### 3️⃣ Firebase 設置
```
自動：無需手動設置
系統會自動在 Firebase 中創建 bills_history collection
```

---

## ✅ 測試清單

### 前台測試

- [ ] **測試 1：點算現金自動保存**
  1. Dashboard → 日結 → Step 2：點算現金
  2. 輸入鈔票數量（例如：1000元 x 10）
  3. 點「上一步」返回 Step 1
  4. 再進入 Step 2
  5. ✅ 應該看到上次輸入的數據

- [ ] **測試 2：點鈔機歷史保存**
  1. 完成一次日結
  2. Dashboard → 「📊 查看點鈔機歷史」
  3. ✅ 應該看到剛才日結的記錄
  4. 點擊展開，查看詳細信息

- [ ] **測試 3：上傳到 Google Sheet**
  1. 點鈔機歷史 → 找到記錄 → 「📤 上傳 Google Sheet」
  2. 等待 1-5 秒
  3. ✅ 應該看到「✅ 已上傳到 Google Sheet」
  4. 記錄狀態應該變為「✓ 已同步」

- [ ] **測試 4：刪除記錄**
  1. 點鈔機歷史 → 找到已同步的記錄 → 「🗑️ 刪除」
  2. 確認對話框
  3. ✅ 應該看到「✅ 已刪除」
  4. 列表中應該消失該記錄

### 後台測試

- [ ] **測試 5：Google Sheet 同步**
  1. Google Sheet → 「🔍 檢查 Firebase 連線狀態」
  2. ✅ 應該看到「✅ Firebase Firestore 連線正常」
  3. 打開「🟣 點鈔機記錄」工作表
  4. ✅ 應該看到剛上傳的記錄

- [ ] **測試 6：手動同步**
  1. Google Sheet → 「🔄 立即同步今日帳務」
  2. ✅ 應該看到「✅ 已同步」
  3. 檢查「🟠 Sync_Logs」工作表
  4. ✅ 應該看到最近的同步日誌

- [ ] **測試 7：鈔票數據完整性**
  1. 在「🟣 點鈔機記錄」工作表查看
  2. ✅ 應該看到 1000、500、100、50、10、5、1 的數量
  3. ✅ 驗證各面額之和 = 實際點算金額

---

## 📊 數據流向圖

```
React App (Frontend)
    ↓
localStorage (本地緩存)
    ├─ billsBackup (當前點鈔狀態)
    └─ billsHistory (歷史記錄)
    ↓ (用戶點「上傳」)
Firebase Firestore
    └─ bills_history collection
    ↓ (自動同步)
Google Apps Script
    ↓
Google Sheet
    └─ 🟣 點鈔機記錄
```

---

## 🛡️ 數據安全性

### 本地 (localStorage)
- ✅ 快速訪問
- ✅ 手機離線時可用
- ❌ 手機丟失會消失
- ⚠️ 需要定期上傳備份

### Firebase
- ✅ 雲端備份
- ✅ 手機丟失無影響
- ✅ 多設備同步
- ⚠️ 需要網路連線

### Google Sheet
- ✅ 最終歸檔
- ✅ 會計可查看
- ✅ 永久保存
- ✅ 內建版本控制

---

## 🎯 推薦工作流程

### 日常（每日結帳）

```
18:00 完成當日營業
  ↓
18:15 點鈔 & 日結
  ✅ React App 自動保存點鈔機記錄
  ↓
18:20 上傳到 Google Sheet（可選）
  點「📤 上傳 Google Sheet」
  ✅ 記錄同步到雲端
  ↓
確認無誤 → 刪除本地（可選）
  點「🗑️ 刪除」
  ✅ 本地清理完畢
```

### 每週（審查）

```
星期一早上：
1. 打開 Google Sheet → 「🟣 點鈔機記錄」
2. 檢查上週 7 天的差異數據
3. 若有異常（差異 ≠ 0）：
   - 查看備註原因
   - 與員工溝通
   - 修正記錄（如需）
```

### 每月（對帳）

```
月底前一天：
1. Google Sheet → 「🟣 點鈔機記錄」
2. 統計本月所有記錄
3. 計算：
   - 總現金進出
   - 平均差異
   - 員工績效
4. 與會計對帳
```

---

## 📝 常見問題

**Q1：為什麼要同時保存在本地和雲端？**
A：防止數據丟失。本地快速訪問，雲端永久備份。

**Q2：可以不上傳 Google Sheet 嗎？**
A：可以。但建議定期上傳，防止手機遺失。

**Q3：上傳後能修改嗎？**
A：可以在 Google Sheet 直接修改，但不建議改動原始記錄。

**Q4：如何匯出給會計？**
A：Google Sheet → 「🟣 點鈔機記錄」 → 下載 Excel

---

## 🚨 已知限制

1. **localStorage 容量**
   - 容量：~5MB
   - 1 年約 365 條記錄 ≈ 200KB
   - ✅ 無需擔心

2. **刪除無法復原**
   - 本地刪除：❌ 無法恢復
   - 建議：先上傳到 Google Sheet 再刪除

3. **離線編輯**
   - 可以查看和操作本地數據
   - 上傳需要網路連線

---

## 🎉 完成！

所有功能已實現，可以開始使用！

**下一步：**
1. ✅ 部署代碼到 React App 和 Google Apps Script
2. ✅ 進行測試清單中的 7 項測試
3. ✅ 開始日常使用
4. ✅ 定期查看 Google Sheet 進行對帳

**如有問題，查看 BILLS_HISTORY_GUIDE.md** 📖
