# 🔒 安全審計報告與優化建議

## 📋 執行日期
2026-01-03

---

## 🔴 **嚴重安全問題（必須立即修復）**

### 1. Firebase API Key 明文暴露 ⚠️
**位置**: `src/App.tsx` 第 42-51 行

**問題**:
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyBFBv_5a15XDtgAPEGQD_8NXMTxVfNLlaY",  // ❌ 明文暴露
  // ...
};
```

**風險等級**: 🔴 **高**
- Firebase Web API Key 雖然有 Firestore 安全規則保護，但仍不應直接暴露在源碼中
- 可能被惡意使用者用於大量請求，造成費用問題

**修復方案**:
1. 將 Firebase 配置移到環境變數：
   ```typescript
   // src/App.tsx
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     // ...
   };
   ```

2. 創建 `.env.local` 文件（已加入 .gitignore）：
   ```
   VITE_FIREBASE_API_KEY=AIzaSyBFBv_5a15XDtgAPEGQD_8NXMTxVfNLlaY
   VITE_FIREBASE_AUTH_DOMAIN=rubbycake-menu.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=rubbycake-menu
   # ... 其他配置
   ```

3. 創建 `.env.example` 作為範本（不含真實值）

**優先級**: 🔴 **今天完成**

---

### 2. PIN 碼驗證改為後端 API ⚠️
**狀態**: ✅ **已修復**（已移除 Firestore 中的 PIN 儲存）

**剩餘工作**:
- [ ] 實作後端 `/api/verify-pin` API endpoint
- [ ] 使用 bcrypt 等安全雜湊儲存 PIN
- [ ] 實作 PIN 嘗試次數限制（防止暴力破解）

**優先級**: 🔴 **今天完成**

---

### 3. Google Apps Script private_key 明文暴露 ⚠️
**位置**: Google Apps Script 專案中的 `CONFIG.private_key`

**問題**:
- 服務帳號 `private_key` 直接寫在程式碼裡，一旦腳本被共用、匯出或貼到版本控制，就等於整把金鑰外流。
- 攻擊者可使用這組金鑰代表你的 GCP 專案呼叫 Firestore / Datastore / 其他 GCP API。

**修復方案**:
1. 將以下欄位搬到 Script Properties 或 Secret Manager：
   - `SERVICE_ACCOUNT_EMAIL`
   - `SERVICE_ACCOUNT_PRIVATE_KEY`
   - `FIREBASE_PROJECT_ID`
2. 在程式碼中改為：
   ```javascript
   const CONFIG = (() => {
     const props = PropertiesService.getScriptProperties();
     return {
       client_email: props.getProperty('SERVICE_ACCOUNT_EMAIL'),
       private_key: props.getProperty('SERVICE_ACCOUNT_PRIVATE_KEY'),
       project_id: props.getProperty('FIREBASE_PROJECT_ID'),
       timezone: 'GMT+8',
     };
   })();
   ```
3. 將原本硬編碼的 `private_key` / `client_email` / `project_id` 從程式碼中完全刪除。

**優先級**: 🔴 **今天完成**

---

### 4. Firestore 安全規則部署 ⚠️
**狀態**: ✅ **規則已撰寫**（`firestore.rules`）

**待辦**:
- [ ] 在 Firebase Console 部署安全規則
- [ ] 測試規則是否正確運作
- [ ] 確認 `daily_closings` 的「每天一筆」限制有效

**優先級**: 🔴 **今天完成**

---

## 🟠 **中等安全問題（本週完成）**

### 5. 防止日結重複操作 ✅
**狀態**: ✅ **已實作**（在 ClosingWizard 中加入 `getDoc` 檢查）

**說明**: 新版本已加入檢查，防止同一天重複日結。

---

### 6. 金額上限驗證 ⚠️
**位置**: `IncomeForm` 和 `ExpenseForm`

**現狀**: 僅有簡單的 `confirm` 確認（金額 > 5000）

**建議**:
- [ ] 加入更嚴格的上限檢查（例如：單筆交易上限 100,000）
- [ ] 加入每日總額上限檢查
- [ ] 記錄異常大額交易到審計日誌

**優先級**: 🟠 **本週完成**

---

### 7. 環境變數配置 ⚠️
**狀態**: ⚠️ **部分完成**（.gitignore 已設定，但尚未使用環境變數）

**待辦**:
- [ ] 將 Firebase 配置移到環境變數（見上方第 1 點）
- [ ] 創建 `.env.example` 範本
- [ ] 更新 README 說明如何設定環境變數

**優先級**: 🟠 **本週完成**

---

## 🟡 **優化項目（本月完成）**

### 8. 員工登入系統
**建議**:
- [ ] 實作 Firebase Authentication（Email/Password 或 Google Sign-In）
- [ ] 記錄每筆操作的員工 ID
- [ ] 權限管理（例如：只有店長可以日結）

**優先級**: 🟡 **本月完成**

---

### 9. 完整審計日誌
**建議**:
- [ ] 記錄所有敏感操作（刪除、修改、日結）
- [ ] 記錄操作時間、員工、IP 地址
- [ ] 建立審計日誌查詢介面

**優先級**: 🟡 **本月完成**

---

### 10. 備份自動化
**建議**:
- [ ] 設定 Firestore 自動備份（Firebase Console）
- [ ] 定期匯出資料到 Cloud Storage
- [ ] 建立災難復原流程

**優先級**: 🟡 **本月完成**

---

## ✅ **已修復的安全問題**

1. ✅ **移除 Firestore 中的 PIN 碼儲存**
   - 已從 `SettingsView` 移除 `admin_pin` 欄位
   - 已移除前端 PIN 碼狀態管理
   - PIN 驗證改為呼叫後端 API

2. ✅ **防止日結重複**
   - 已加入 `getDoc` 檢查，防止同一天重複日結

3. ✅ **.gitignore 設定**
   - 已確保 `.env` 和敏感檔案不會被上傳

4. ✅ **ClosingWizard 優化**
   - 修復現金計算邏輯（只計算 CASH 渠道）
   - 加入 Debug 模式
   - 加入差異警告（> 500 元）
   - 加入詳細計算記錄

---

## 📊 **代碼質量評分**

```
安全性       ⭐⭐☆☆☆ (2/5) → 修復 API Key 後 ⭐⭐⭐⭐☆ (4/5)
功能完整性   ⭐⭐⭐⭐⭐ (5/5)
代碼可維護性 ⭐⭐⭐⭐☆ (4/5)
錯誤處理     ⭐⭐⭐⭐☆ (4/5)
離線能力     ⭐⭐⭐⭐⭐ (5/5)
整體評分     ⭐⭐⭐⭐☆ (4/5) → 修復安全問題後 ⭐⭐⭐⭐⭐ (5/5)
```

---

## 🎯 **立即行動清單**

### 今天必須完成：
1. [ ] 將 Firebase 配置移到環境變數
2. [ ] 將 Google Apps Script 內的 `client_email` / `private_key` / `project_id` 搬到 Script Properties 或 Secret Manager
3. [ ] 部署 Firestore 安全規則到 Firebase Console
4. [ ] 實作後端 PIN 驗證 API
5. [ ] 從 Firestore 刪除現有的 `admin_pin` 資料（如果有的話）

### 本週完成：
1. [ ] 加入金額上限驗證
2. [ ] 建立 `.env.example` 範本
3. [ ] 更新 README 文件

### 本月完成：
1. [ ] 實作員工登入系統
2. [ ] 建立完整審計日誌
3. [ ] 設定自動備份

---

## 📝 **備註**

- Firebase Web API Key 雖然有安全規則保護，但最佳實踐是使用環境變數
- PIN 碼驗證必須在後端實作，前端只負責收集輸入
- 所有敏感操作都應該記錄審計日誌
- 定期檢查 Firestore 安全規則是否正確運作
