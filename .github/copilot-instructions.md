# Moon Moon Finance - AI Coding Agent Instructions

## Project Overview
**moon-moon-finance** is a React + TypeScript + Vite POS (Point of Sale) system for a dessert shop (moon_moon_dessert). It's a real-time financial management app featuring transaction tracking, expense management, daily cash reconciliation, and fee configuration. All data persists to Firebase Firestore.

## Architecture & Data Flow

### Core Stack
- **Frontend**: React 19 + TypeScript 5.9 + Tailwind CSS
- **Build**: Vite 7.2 with React Fast Refresh
- **Backend**: Firebase (Auth, Firestore)
- **UI Icons**: Lucide React
- **Date Handling**: date-fns

### Single-File Monolithic Pattern
The entire app logic lives in [src/App.tsx](src/App.tsx) (700 lines). Key architectural patterns:
- **UI Components**: Card, Button, Input are custom styled components (lines 132-157)
- **Context for Toast**: `ToastContext` + `useToast` hook for notification system (lines 171-172)
- **State Management**: Local React state; Firebase collections auto-sync via `onSnapshot` listeners
- **Form Submission**: Optimistic UI updates disabled; waits for Firebase write completion before success feedback

### Data Models (Firestore Collections)
1. **transactions** - Income entries
   ```typescript
   { type: 'INCOME', timestamp, channel, amount, fee_rate_snapshot, fee_amount, net_amount, note, status }
   ```
2. **expenses** - Cost entries  
   ```typescript
   { date, category ('COGS'|'OPEX'), item, amount, source ('DRAWER'|'BANK'|'STAFF_POCKET'), created_at, status }
   ```
3. **daily_closings** - End-of-day reconciliation records
   ```typescript
   { date, opening_float, total_cash_sales, total_cash_expenses, expected_drawer, actual_counted, variance, cash_drop, closing_float, staff_name }
   ```
4. **settings/fees** - Configuration doc with payment channel fee rates and admin PIN

### Payment Channels & Fees
Five channels defined in `DEFAULT_FEE_CONFIG` (line 60):
- CASH: 0% fee
- LINEPAY: 2.5% fee
- UBER: 0.35 flat fee
- GOOGLE: 0% fee  
- TRANSFER: 0% fee

Fee calculations use `useMemo` for memoization (line 285); always snapshot the fee rate at transaction time.

## Critical Developer Workflows

### Build & Dev
```bash
npm run dev      # Vite dev server on localhost:5173 with HMR
npm run build    # TypeScript compile + Vite bundle to dist/
npm run lint     # ESLint check (eslint.config.js)
npm run preview  # Preview production build locally
```

### Firebase Setup
Firebase config is hardcoded in [src/App.tsx](src/App.tsx) lines 43-52 (project: `rubbycake-menu`). Uses anonymous auth + Firestore for persistence. On first load, auto-signs in user and subscribes to real-time collection updates.

### Common Tasks
- **Adding a payment channel**: Update `DEFAULT_FEE_CONFIG`, `CHANNEL_LABELS`, and the UI that lists channels
- **Modifying a form**: Use the `Input` component (line 143); wrap with `useState` for field state
- **Data sync**: Don't manually fetch; use `onSnapshot` listeners (examples at lines 614-629)
- **Error handling**: Use `showToast(msg, 'error')` from `useToast()` context
- **PIN verification**: Trigger `PinModal` (line 621) when high-risk operations (void, settings changes) are needed

## Code Patterns & Conventions

### Component Structure
- **View components** (Dashboard, IncomeForm, ClosingWizard, etc.) handle UI + local form state
- **No separate component files** - everything in App.tsx keeps context tight
- **Inline handlers** - form submissions use `handleSubmit` functions that call Firebase + showToast
- **Memoization**: Use `useMemo` to avoid recalculating metrics on every render (line 225, 285)

### Styling
- **Tailwind utility classes** only; no external CSS-in-JS libraries
- **Dark theme**: Black backgrounds (`bg-black`), zinc borders (`border-zinc-800`), white text
- **Animations**: Predefined classes like `animate-fade-in-up`, `active:scale-95`
- **Responsive**: `grid-cols-2 lg:grid-cols-4` pattern; mobile-first design

### State & Effects
- Firebase setup in top-level `useEffect` (lines 605-612): anon auth + event listeners
- Transaction/expense subscription filtered to today's date (lines 614-629)
- Void operations require PIN confirmation before `updateDoc` (lines 642-650)
- Status field tracks VALID vs VOID; queries filter by status

### Type Safety
- Interfaces defined at top: `Transaction`, `Expense`, `DailyClosing` (lines 78-115)
- `PaymentChannel` is a type union `keyof typeof DEFAULT_FEE_CONFIG`
- Use `any` types sparingly; prefer explicit interfaces when defining props

## Integration Points

### Firebase Firestore Queries
- **Real-time**: `onSnapshot(query(collection(...), orderBy(), limit()), callback)`
- **One-time**: `getDocs(query(...))` for initial closing float load
- **Writes**: `addDoc()` for new transactions/expenses, `updateDoc()` for status changes
- **Timestamps**: Use `serverTimestamp()` for all audit timestamps, not `Date.now()`

### Cross-Component Communication
- **Toast notifications**: Via `ToastContext` provider (lines 651-656)
- **View navigation**: `view` state in App root; pass `onNavigate={setView}` to components
- **Settings sync**: Real-time listener on `settings/fees` doc auto-updates `feeConfig` state

## Conventions NOT to Break
1. **Never commit Firebase keys**: Config keys hardcoded for dev convenience—rotate/sanitize before production
2. **PIN always required for data mutations**: void, settings changes must verify admin PIN first
3. **Filter by date on client**: Queries fetch all 100 docs, client filters to today
4. **Fee snapshot immutability**: Once a transaction is recorded, don't modify its fee snapshot even if rates change
5. **Status vs deletion**: Use `status: 'VOID'` instead of deleting documents; enables audit trails

## Testing & Debugging
- No test files in repo; manual testing against Firebase emulator recommended
- Check browser console for unhandled promises in Firebase listeners
- Verify `isOnline` state (displayed in header) matches actual network connectivity
- For locale-specific issues: all date/currency formatting uses `zh-TW` (Traditional Chinese)
