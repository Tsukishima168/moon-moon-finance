# 🐛 Bug 修復方案 - 月島甜點 POS 系統

## 問題 1️⃣：點鈔機內容丟失 ✅ 已修復

### 根因
React 元件卸載時，點鈔機數據（鈔票數量）存儲在 State 中，所以會消失。

### 解決方案
使用 `localStorage` 自動備份點鈔機數據：

✅ **改進內容：**
- **自動保存**：每次修改鈔票數量，自動保存到瀏覽器本地儲存
- **自動恢復**：進入點鈔機時，自動載入上次保存的數據
- **清除按鈕**：新增「🗑️ 清空」按鈕，快速清空所有鈔票計數
- **恢復按鈕**：新增「↶ 恢復」按鈕，恢復上次保存的數據

### 使用流程
1. 點「日結」→「Step 2：點算現金」
2. 輸入鈔票數量，**數據自動保存**
3. 不小心返回，進來時會看到上次的數據
4. 若要重新計算：點「🗑️ 清空」確認即可

---

## 問題 2️⃣：Google Sheet 數據未同步 ✅ 已修復

### 根因
1. Apps Script 沒有自動執行同步（需要手動觸發）
2. 同步失敗時無日誌記錄，無法調試
3. 無法驗證 Firebase 連線狀態

### 解決方案

#### A. 設置自動同步（每小時）

1. **打開 Google Sheet → 擴充功能 → Apps Script**
2. **左側選單 → 觸發條件（時鐘圖示）**
3. **右下「新增觸發條件」**
4. **設定如下：**
   - 要執行的函式：`runDailySync`
   - 部署：新的部署
   - 事件來源：時間驅動
   - 時間型觸發條件類型：**小時計時器**
   - 選擇時間：**每小時** (或 **每30分鐘**)
5. **點「建立」**

✅ 現在 Apps Script 會**每小時自動同步一次**前一天的資料

#### B. 新增菜單功能

更新後的 Google Sheet 菜單新增：

```
🍰 月島甜點系統
├─ 🔄 立即同步今日帳務  ← 手動同步今天
├─ 🔍 檢查 Firebase 連線狀態  ← 驗證連線 (新增)
├─ 📊 查看同步日誌  ← 查看調試信息 (新增)
└─ 🏗️ 初始化/重置報表 (V16)
```

#### C. 日誌系統

**🔍 檢查 Firebase 連線狀態**
- 驗證 Firebase 能否讀取資料
- 顯示認證狀態和錯誤訊息

**📊 查看同步日誌**
- 自動生成「🟠 Sync_Logs」工作表
- 記錄每次同步的詳細日誌：
  ```
  時間 | 等級 | 訊息
  2026-01-03 10:30:45 | SUCCESS | 已同步 2026-01-02 資料
  2026-01-03 10:30:46 | DEBUG | ✓ Token 取得成功
  2026-01-03 10:30:47 | DEBUG | ✓ 取得 5 筆營收紀錄
  2026-01-03 10:30:48 | DEBUG | ✓ 交易資料：更新 0 筆，新增 5 筆
  ```

#### D. 改進的錯誤處理

- 同步失敗會顯示具體錯誤訊息
- 所有操作都記錄到日誌
- 可追蹤 Firebase 連線問題

---

## 🚀 使用建議

### 日常工作流程

**每天結帳後：**
1. 在 React App 點「日結」完成
2. 打開 Google Sheet
3. 點「🔄 立即同步今日帳務」（或等待自動同步）
4. 若有問題，點「🔍 檢查 Firebase 連線狀態」

### 故障排除

**Q: 為什麼沒有看到 Google Sheet 的新菜單？**
A: 
1. 確保已複製最新的 Apps Script 代碼
2. 刷新 Google Sheet 頁面
3. 菜單應會出現在頂部

**Q: 如何確認資料是否同步成功？**
A:
1. 點「📊 查看同步日誌」
2. 查看「🟠 Sync_Logs」工作表最後幾行
3. 應該看到「SUCCESS」訊息

**Q: Firebase 連線失敗怎麼辦？**
A:
1. 點「🔍 檢查 Firebase 連線狀態」
2. 查看錯誤訊息
3. 常見問題：
   - `private_key` 格式錯誤 → 檢查換行符 `\n`
   - 專案 ID 錯誤 → 確認 `project_id: "rubbycake-menu"`
   - Firestore 權限不足 → 檢查 Firebase 規則設定

---

## 📋 改更清單

### React App (src/App.tsx)
- ✅ 點鈔機使用 `localStorage` 自動備份
- ✅ 新增「清除」和「恢復」按鈕
- ✅ 日結完成後清除備份（防止混亂）
- ✅ 上傳時顯示「⏳ 上傳中...」反饋
- ✅ 改進錯誤訊息（顯示具體原因）

### Google Apps Script (Apps_Script_Fixed.gs)
- ✅ 新增日誌系統（`logSync`）
- ✅ 新增 Firebase 連線檢查（`checkFirebaseConnection`）
- ✅ 新增日誌查看功能（`viewSyncLogs`）
- ✅ 改進錯誤消息和追蹤
- ✅ 添加詳細的同步日誌
- ✅ 優化 Token 生成邏輯

---

## ✨ 效果對比

| 功能 | 修復前 | 修復後 |
|------|-------|-------|
| 點鈔機丟失 | ❌ 會消失 | ✅ 自動保存 |
| 可恢復數據 | ❌ 無法恢復 | ✅ 可點「↶ 恢復」 |
| Google Sheet 同步 | ❌ 手動不可靠 | ✅ 自動每小時 |
| 同步失敗通知 | ❌ 無聲失敗 | ✅ 詳細日誌和錯誤信息 |
| 連線驗證 | ❌ 不可驗證 | ✅ 可點「🔍 檢查」 |
| 調試能力 | ❌ 無日誌 | ✅ 完整日誌追蹤 |

---

## 🔧 技術細節

### localStorage 實現
```javascript
// 初始化時從 localStorage 讀取
const [bills, setBills] = useState<any>(() => {
  try {
    const saved = localStorage.getItem('billsBackup');
    return saved ? JSON.parse(saved) : { 1000: 0, 500: 0, ... };
  } catch (e) {
    return { 1000: 0, 500: 0, ... };
  }
});

// 每次修改自動保存
useEffect(() => {
  localStorage.setItem('billsBackup', JSON.stringify(bills));
}, [bills]);
```

### Firebase 日誌系統
```javascript
function logSync(message, level = "INFO") {
  const time = Utilities.formatDate(new Date(), CONFIG.timezone, "yyyy-MM-dd HH:mm:ss");
  const logEntry = `[${time}] [${level}] ${message}`;
  
  const props = PropertiesService.getScriptProperties();
  let existingLogs = props.getProperty('syncLogs') || '';
  existingLogs += logEntry + '\n';
  
  // 限制大小 (保留最後 50KB)
  if (existingLogs.length > 51200) {
    existingLogs = existingLogs.substring(existingLogs.length - 51200);
  }
  
  props.setProperty('syncLogs', existingLogs);
}
```

---

## 📞 下次更新計畫

- [ ] 前台 React App 添加同步狀態指示
- [ ] Google Sheet 添加同步時間戳記
- [ ] 自動報警（若24小時未同步）
- [ ] 批量重試機制（失敗自動重試）
- [ ] 數據備份和版本控制

---

**更新日期**: 2026-01-03  
**版本**: V1.1 (含 Bug 修復)
