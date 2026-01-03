import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  orderBy, 
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  Plus, 
  Minus, 
  CheckSquare, 
  History, 
  Settings, 
  ArrowRight,
  Wifi,
  WifiOff,
  Trash2,
  Lock,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// ==========================================
// 🚀 Firebase 正式設定 (RubbyCake-Menu)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBFBv_5a15XDtgAPEGQD_8NXMTxVfNLlaY",
  authDomain: "rubbycake-menu.firebaseapp.com",
  databaseURL: "https://rubbycake-menu.firebaseio.com",
  projectId: "rubbycake-menu",
  storageBucket: "rubbycake-menu.firebasestorage.app",
  messagingSenderId: "547353287776",
  appId: "1:547353287776:web:01b747f3b0bde5cb73b705",
  measurementId: "G-Q1BMRLKQ1M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 📦 型別定義 (TypeScript Interfaces)
// ==========================================
const DEFAULT_FEE_CONFIG: any = { 
  CASH: 0.00, 
  LINEPAY: 0.025, 
  UBER: 0.35, 
  GOOGLE: 0.00, 
  TRANSFER: 0.00 
};

const CHANNEL_LABELS: Record<string, string> = { 
  CASH: '現金', 
  LINEPAY: 'LinePay', 
  UBER: 'UberEats', 
  GOOGLE: 'GooglePay', 
  TRANSFER: '轉帳匯款' 
};

type PaymentChannel = keyof typeof DEFAULT_FEE_CONFIG;

// 修正：定義在全域，解決 TS 找不到名稱的問題
interface Transaction {
  id: string;
  timestamp: any; 
  type: 'INCOME';
  channel: PaymentChannel;
  amount: number;
  fee_rate_snapshot: number;
  fee_amount: number;
  net_amount: number;
  note?: string;
  status?: 'VALID' | 'VOID';
}

interface Expense {
  id: string;
  date: string; 
  category: 'COGS' | 'OPEX';
  item: string;
  amount: number;
  source: 'DRAWER' | 'BANK' | 'STAFF_POCKET';
  created_at: any;
  status?: 'VALID' | 'VOID';
}

interface DailyClosing {
  id: string;
  date: string;
  opening_float: number;
  total_cash_sales: number;
  total_cash_expenses: number;
  expected_drawer: number;
  actual_counted: number;
  variance: number;
  variance_reason?: string;
  cash_drop: number;
  closing_float: number;
  staff_name: string;
  status: 'COMPLETED';
}

// --- Helpers ---
const getTodayString = () => new Date().toISOString().split('T')[0];
const formatCurrency = (num: number) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(num);
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
const formatTime = (ts: any) => {
  if (!ts) return '--:--';
  const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// --- UI Components ---
const Card = ({ children, className = '' }: any) => <div className={`bg-black border border-zinc-800 p-6 ${className}`}>{children}</div>;

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }: any) => {
  const base = "px-6 py-3 font-bold transition-all flex items-center justify-center disabled:opacity-50 border-2 select-none active:scale-95";
  const variants: any = {
    primary: "bg-white text-black border-white hover:bg-zinc-200",
    secondary: "bg-black text-white border-zinc-800 hover:border-white",
    danger: "bg-red-900/20 text-red-500 border-red-900 hover:border-red-500",
    ghost: "bg-transparent text-zinc-500 border-transparent hover:text-white"
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>{children}</button>;
};

const Input = ({ label, value, onChange, type = "text", placeholder, className = "" }: any) => (
  <div className={`space-y-1 ${className}`}>
    {label && <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{label}</label>}
    <div className="relative">
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-black border-b-2 border-zinc-800 px-0 py-3 text-white focus:outline-none focus:border-white font-mono text-lg rounded-none transition-colors"
      />
    </div>
  </div>
);

// Toast System
const ToastContainer = ({ toasts }: { toasts: any[] }) => (
  <div className="fixed bottom-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
    {toasts.map(t => (
      <div key={t.id} className="bg-zinc-900 border border-zinc-700 text-white px-6 py-3 shadow-2xl flex items-center gap-3 animate-fade-in-up">
        {t.type === 'success' ? <CheckSquare size={16} className="text-green-500"/> : <AlertTriangle size={16} className="text-red-500"/>}
        <span className="font-bold text-sm tracking-wide">{t.msg}</span>
      </div>
    ))}
  </div>
);

const ToastContext = createContext<any>(null);
const useToast = () => useContext(ToastContext);

// --- Main Views ---

const TransactionList = ({ items, onVoid }: any) => {
  return (
    <div className="mt-8 border-t-2 border-zinc-900 pt-6">
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">今日流水帳 (TODAY)</h3>
      <div className="space-y-0 divide-y divide-zinc-900 border border-zinc-900 bg-black">
        {items.length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm font-mono uppercase">NO RECORDS TODAY</div>
        ) : (
          items.map((item: any) => {
            const isIncome = item.type === 'INCOME';
            const isVoid = item.status === 'VOID';
            return (
              <div key={item.id} className={`flex items-center justify-between p-4 group transition-all ${isVoid ? 'opacity-30 grayscale' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 ${isVoid ? 'bg-zinc-700' : isIncome ? 'bg-white' : 'bg-zinc-600'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isVoid ? 'line-through decoration-2 decoration-zinc-500' : 'text-white'}`}>
                        {isIncome ? CHANNEL_LABELS[item.channel] || item.channel : item.item}
                      </span>
                      {isVoid && <span className="text-[10px] border border-red-900 text-red-700 px-1.5 py-0.5 font-bold tracking-wider">VOID</span>}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
                      {formatTime(item.timestamp || item.created_at)} • {isIncome ? '營收' : '支出'} {item.note ? `• ${item.note}` : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-mono font-bold ${isVoid ? 'line-through text-zinc-600' : isIncome ? 'text-white' : 'text-zinc-400'}`}>
                    {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                  </span>
                  {!isVoid && (
                    <button onClick={() => onVoid(item)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const Dashboard = ({ transactions, expenses, lastClosingFloat, onNavigate, onVoidItem }: any) => {
  const allItems = useMemo(() => {
    const txs = transactions.map((t: any) => ({ ...t, sortTime: t.timestamp }));
    const exps = expenses.map((e: any) => ({ ...e, sortTime: e.created_at, type: 'EXPENSE' }));
    return [...txs, ...exps].sort((a: any, b: any) => (b.sortTime?.seconds || 0) - (a.sortTime?.seconds || 0));
  }, [transactions, expenses]);

  const metrics = useMemo(() => {
    const validTx = transactions.filter((t: any) => t.status !== 'VOID' && t.status !== 'CLOSED');
    const validExp = expenses.filter((e: any) => e.status !== 'VOID' && e.status !== 'CLOSED');
    const gross = validTx.reduce((sum: number, t: any) => sum + t.amount, 0);
    const fees = validTx.reduce((sum: number, t: any) => sum + t.fee_amount, 0);
    const exp = validExp.reduce((sum: number, e: any) => sum + e.amount, 0);
    const cashSales = validTx.filter((t: any) => t.channel === 'CASH').reduce((sum: number, t: any) => sum + t.amount, 0);
    const cashExpenses = validExp.filter((e: any) => e.source === 'DRAWER').reduce((sum: number, e: any) => sum + e.amount, 0);
    const shouldHaveCash = lastClosingFloat + cashSales - cashExpenses;
    return { gross, fees, exp, cashSales, cashExpenses, shouldHaveCash };
  }, [transactions, expenses, lastClosingFloat]);

  const Metric = ({ title, value }: any) => (
    <div className="bg-black border-r border-b border-zinc-800 p-5 flex flex-col justify-between h-28 last:border-r-0 md:last:border-r-0">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-bold text-white font-mono tracking-tighter">{value}</h3>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="border-2 border-zinc-800 bg-black">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Metric title="收入" value={formatCurrency(metrics.gross)} />
          <Metric title="手續費" value={`-${formatCurrency(metrics.fees)}`} />
          <Metric title="支出" value={`-${formatCurrency(metrics.exp)}`} />
          <div className="bg-white p-5 flex flex-col justify-between h-28 border-b border-zinc-800 md:border-b-0">
            <div className="flex justify-between items-start"><p className="text-[10px] font-bold text-black uppercase tracking-widest">應有現金</p><div className="w-2 h-2 bg-black"/></div>
            <h3 className="text-3xl font-bold text-black font-mono tracking-tighter">{formatCurrency(metrics.shouldHaveCash)}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => onNavigate('income')} className="h-24 hover:bg-zinc-900 border-2 flex-col gap-2"><Plus size={24} /><span className="text-xs tracking-wider">營收</span></Button>
        <Button onClick={() => onNavigate('expense')} className="h-24 hover:bg-zinc-900 border-2 flex-col gap-2"><Minus size={24} /><span className="text-xs tracking-wider">支出</span></Button>
        <Button onClick={() => onNavigate('closing')} variant="secondary" className="h-24 border-2 flex-col gap-2"><CheckSquare size={24} /><span className="text-xs tracking-wider">日結</span></Button>
        <Button onClick={() => onNavigate('history')} variant="secondary" className="h-24 border-2 flex-col gap-2"><History size={24} /><span className="text-xs tracking-wider">紀錄</span></Button>
      </div>
      
      {/* 🗂️ 新增：點鈔機歷史按鈕 */}
      <div className="grid grid-cols-1 gap-3">
        <Button onClick={() => onNavigate('billsHistory')} variant="secondary" className="h-12 border-2"><span className="tracking-wider">📊 查看點鈔機歷史</span></Button>
      </div>
      
      <TransactionList items={allItems} onVoid={onVoidItem} />
    </div>
  );
};

const IncomeForm = ({ feeConfig, onCancel, onSuccess }: any) => {
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState<PaymentChannel>('CASH');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const calc = useMemo(() => {
    const val = parseFloat(amount) || 0;
    const rate = feeConfig[channel] || 0;
    return { fee: Math.round(val * rate), net: val - Math.round(val * rate) };
  }, [amount, channel, feeConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || isSubmitting) return;
    if (val > 5000 && !confirm(`金額 ${formatCurrency(val)} 較大，確定嗎？`)) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        type: 'INCOME', timestamp: serverTimestamp(), channel, amount: val,
        fee_rate_snapshot: feeConfig[channel] || 0, fee_amount: calc.fee, net_amount: calc.net, note, status: 'VALID'
      });
      showToast('營收已入帳', 'success');
      onSuccess();
    } catch (e) { showToast('發生錯誤', 'error'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <PageHeader title="INCOME" subtitle="新增營收" onBack={onCancel} />
      <Card>
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(feeConfig) as string[]).map((key) => (
              <button key={key} onClick={() => setChannel(key as PaymentChannel)}
                className={`p-4 border-2 text-sm font-bold transition-all ${channel === key ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                {CHANNEL_LABELS[key] || key}
              </button>
            ))}
          </div>
          <Input label="金額" type="number" value={amount} onChange={(e:any) => setAmount(e.target.value)} placeholder="0" />
          <div className="border-2 border-zinc-800 p-4 space-y-2 text-sm bg-zinc-900/20 font-mono">
             <div className="flex justify-between text-zinc-500"><span>GROSS</span><span>{formatCurrency(parseFloat(amount)||0)}</span></div>
             <div className="flex justify-between text-zinc-500"><span>FEE</span><span>-{formatCurrency(calc.fee)}</span></div>
             <div className="h-px bg-zinc-800 my-2"></div>
             <div className="flex justify-between font-bold text-white text-lg"><span>NET</span><span>{formatCurrency(calc.net)}</span></div>
          </div>
          <Input label="備註 (選填)" value={note} onChange={(e:any) => setNote(e.target.value)} />
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-16 text-lg">{isSubmitting ? '...' : '確認入帳'}</Button>
        </div>
      </Card>
    </div>
  );
};

const ExpenseForm = ({ onCancel, onSuccess }: any) => {
  const [form, setForm] = useState<any>({ date: getTodayString(), category: 'COGS', source: 'DRAWER', amount: '', item: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    if (!form.amount || !form.item || isSubmitting) return;
    const val = parseFloat(form.amount);
    if (val > 5000 && !confirm(`金額 ${formatCurrency(val)} 較大，確定嗎？`)) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'expenses'), { ...form, amount: val, created_at: serverTimestamp(), status: 'VALID' });
      showToast('支出已儲存', 'success');
      onSuccess();
    } catch (e) { showToast('發生錯誤', 'error'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <PageHeader title="EXPENSE" subtitle="新增支出" onBack={onCancel} />
      <Card>
        <div className="space-y-8">
          <div className="flex gap-4">
             <div className="flex-1"><label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">類別</label>
               <select className="w-full bg-black border-b-2 border-zinc-800 py-3 text-white focus:outline-none rounded-none"
                  value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  <option value="COGS">成本 (COGS)</option><option value="OPEX">營運 (OPEX)</option>
                </select></div>
             <div className="flex-1"><Input label="日期" type="date" value={form.date} onChange={(e:any) => setForm({...form, date: e.target.value})} /></div>
          </div>
          <Input label="項目" value={form.item} onChange={(e:any) => setForm({...form, item: e.target.value})} />
          <Input label="金額" type="number" value={form.amount} onChange={(e:any) => setForm({...form, amount: e.target.value})} />
          <div className="grid grid-cols-3 gap-3">
             {[{ id: 'DRAWER', label: '錢櫃' }, { id: 'BANK', label: '銀行' }, { id: 'STAFF_POCKET', label: '代墊' }].map(src => (
               <button key={src.id} onClick={() => setForm({...form, source: src.id})}
                 className={`p-4 border-2 text-sm font-bold transition-all ${form.source === src.id ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                 {src.label}
               </button>
             ))}
          </div>
          <Button onClick={handleSubmit} variant="secondary" disabled={isSubmitting} className="w-full h-16 text-lg">確認支出</Button>
        </div>
      </Card>
    </div>
  );
};

const ClosingWizard = ({ transactions, expenses, onCancel, onSuccess, lastClosingFloat }: any) => {
  const [step, setStep] = useState(1);
  const [openingFloat, setOpeningFloat] = useState(lastClosingFloat || 5110);
  const [closingFloat, setClosingFloat] = useState(5110);
  const [actualCounted, setActualCounted] = useState(0);
  
  // 🛡️ 改進：使用 localStorage 備份點鈔機資料，防止丟失
  const [bills, setBills] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('billsBackup');
      return saved ? JSON.parse(saved) : { 1000: 0, 500: 0, 100: 0, 50: 0, 10: 0, 5: 0, 1: 0 };
    } catch (e) {
      return { 1000: 0, 500: 0, 100: 0, 50: 0, 10: 0, 5: 0, 1: 0 };
    }
  });
  
  const [reason, setReason] = useState('');
  const [staffName, setStaffName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  
  // 🛡️ 當 bills 改變時，自動保存到 localStorage
  useEffect(() => {
    localStorage.setItem('billsBackup', JSON.stringify(bills));
  }, [bills]);

  // 🗂️ 保存點鈔機歷史紀錄
  const saveBillsHistory = (historyData: any) => {
    try {
      const history = JSON.parse(localStorage.getItem('billsHistory') || '[]');
      history.push(historyData);
      localStorage.setItem('billsHistory', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save bills history:', e);
    }
  };

  const cashSales = useMemo(() => transactions.filter((t:any) => t.channel === 'CASH' && t.status !== 'VOID').reduce((a:number,c:any) => a+c.amount,0), [transactions]);
  const cashExpenses = useMemo(() => expenses.filter((e:any) => e.source === 'DRAWER' && e.status !== 'VOID').reduce((a:number,c:any) => a+c.amount,0), [expenses]);
  const expectedDrawer = openingFloat + cashSales - cashExpenses;
  const variance = actualCounted - expectedDrawer;
  const cashDrop = actualCounted - closingFloat;

  useEffect(() => {
    const sum = Object.keys(bills).reduce((acc, denom) => acc + parseInt(denom) * bills[denom], 0);
    setActualCounted(sum);
  }, [bills]);

  const handleFinish = async () => {
    if (step === 3 && ((variance !== 0 && !reason) || !staffName)) return showToast('請填寫差異原因與經手人', 'error');
    
    setIsSubmitting(true);
    try {
      const today = getTodayString();
      const closingPayload = {
        date: today, opening_float: openingFloat, total_cash_sales: cashSales, total_cash_expenses: cashExpenses,
        expected_drawer: expectedDrawer, actual_counted: actualCounted, variance, variance_reason: reason,
        cash_drop: cashDrop, closing_float: closingFloat, staff_name: staffName, status: 'COMPLETED', timestamp: serverTimestamp()
      };
      
      const batch = writeBatch(db);
      
      const closingRef = doc(db, 'daily_closings', today);
      batch.set(closingRef, { ...closingPayload, closed_at: serverTimestamp(), finalized: true });
      
      // 🗂️ 保存點鈔機歷史紀錄
      saveBillsHistory({
        date: today,
        time: new Date().toLocaleTimeString('zh-TW'),
        bills: bills,
        actualCounted: actualCounted,
        closingFloat: closingFloat,
        variance: variance,
        staffName: staffName,
        synced: false, // 記錄是否已上傳到 Google Sheet
        syncTime: null
      });
      
      // 標記當日 transactions 為 CLOSED（過濾方式：按 date field，若無則遍歷全部）
      const txCol = collection(db, 'transactions');
      const txSnap = await getDocs(query(txCol, orderBy('timestamp', 'desc'), limit(500)));
      txSnap.forEach(docSnap => {
        const tx = docSnap.data();
        const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp?.seconds * 1000);
        const txDateStr = txDate.toISOString().split('T')[0];
        if (txDateStr === today && tx.status === 'VALID') {
          const docRef = doc(db, 'transactions', docSnap.id);
          batch.update(docRef, { status: 'CLOSED', closed_at: serverTimestamp() });
        }
      });
      
      // 標記當日 expenses 為 CLOSED
      const expCol = collection(db, 'expenses');
      const expSnap = await getDocs(query(expCol, orderBy('created_at', 'desc'), limit(500)));
      expSnap.forEach(docSnap => {
        const exp = docSnap.data();
        if (exp.date === today && exp.status === 'VALID') {
          const docRef = doc(db, 'expenses', docSnap.id);
          batch.update(docRef, { status: 'CLOSED', closed_at: serverTimestamp() });
        }
      });
      
      await batch.commit();
      
      // 🛡️ 日結完成後，清除 localStorage 備份
      localStorage.removeItem('billsBackup');
      
      showToast('日結完成！資料已上傳 Firebase', 'success');
      onSuccess();
    } catch (e) { 
      showToast('❌ 日結失敗：' + (e as any).message, 'error');
      console.error('Closing error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <PageHeader title="CLOSING" subtitle={`Step ${step}/3`} onBack={onCancel} />
      <Card>
        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-black border-2 border-zinc-800"><p className="text-xs text-zinc-500 uppercase">開店金</p><input type="number" value={openingFloat} onChange={e=>setOpeningFloat(parseFloat(e.target.value))} className="w-full bg-black text-white text-xl border-b border-zinc-800 focus:outline-none mt-2"/></div>
               <div className="p-4 bg-black border-2 border-zinc-800"><p className="text-xs text-zinc-500 uppercase">系統應有</p><p className="text-xl text-white mt-2">{formatCurrency(expectedDrawer)}</p></div>
            </div>
            <div className="space-y-2 border-2 border-zinc-900 p-4 font-mono text-sm">
               <div className="flex justify-between"><span>+ 現金營收</span><span className="text-white">{formatCurrency(cashSales)}</span></div>
               <div className="flex justify-between"><span>- 現金支出</span><span className="text-white">{formatCurrency(cashExpenses)}</span></div>
            </div>
            <Button onClick={() => setStep(2)} className="w-full mt-4 h-14 border-2" variant="secondary">下一步：點鈔</Button>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
             <div className="flex justify-between border-b-2 border-zinc-800 pb-2">
               <h3 className="text-lg font-bold">點算現金</h3>
               <p className="text-2xl font-mono text-white">{formatCurrency(actualCounted)}</p>
             </div>
             
             {/* 🛡️ 新增：清除和恢復按鈕 */}
             <div className="flex gap-2">
               <Button 
                 variant="danger" 
                 onClick={() => {
                   if (confirm('確定要清空所有鈔票數據嗎？')) {
                     setBills({ 1000: 0, 500: 0, 100: 0, 50: 0, 10: 0, 5: 0, 1: 0 });
                     showToast('已清空點鈔機', 'success');
                   }
                 }} 
                 className="flex-1 text-xs"
               >
                 🗑️ 清空
               </Button>
               <Button 
                 variant="secondary" 
                 onClick={() => {
                   try {
                     const saved = localStorage.getItem('billsBackup');
                     if (saved) {
                       const data = JSON.parse(saved);
                       setBills(data);
                       showToast('已恢復上次數據', 'success');
                     }
                   } catch (e) {
                     showToast('無法恢復數據', 'error');
                   }
                 }} 
                 className="flex-1 text-xs"
               >
                 ↶ 恢復
               </Button>
             </div>
             
             <div className="grid grid-cols-2 gap-4">{[1000,500,100,50,10,5,1].map(d => (
               <div key={d} className="flex justify-between items-center border-b border-zinc-900 pb-1">
                 <span className="text-zinc-500 w-12 font-mono">{d}</span>
                 <div className="flex items-center text-white gap-2">
                   <button onClick={() => setBills((b:any) => ({...b, [d]: Math.max(0, b[d]-1)}))} className="w-8 h-8 flex items-center justify-center border border-zinc-800 active:bg-zinc-800">-</button>
                   <input type="number" inputMode="decimal" className="w-12 bg-black text-center text-white focus:outline-none" value={bills[d]} onChange={e => setBills({...bills, [d]: parseInt(e.target.value)||0})}/>
                   <button onClick={() => setBills((b:any) => ({...b, [d]: b[d]+1}))} className="w-8 h-8 flex items-center justify-center border border-zinc-800 active:bg-zinc-800">+</button>
                 </div>
               </div>
             ))}</div>
             <div className="flex gap-4 pt-4"><Button variant="ghost" onClick={()=>setStep(1)} className="flex-1">上一步</Button><Button onClick={()=>setStep(3)} className="flex-[2] h-14 border-2" variant="secondary">下一步</Button></div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <div className={`p-6 text-center border-2 ${variance===0?'border-zinc-800 bg-zinc-900/20':'border-white'}`}><p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">差異</p><h2 className="text-4xl font-bold my-2 text-white font-mono">{variance>0?'+':''}{variance}</h2></div>
            {variance!==0 && <div className="animate-pulse-once"><Input label="差異原因" value={reason} onChange={(e:any)=>setReason(e.target.value)} /></div>}
            <Input label="明日找零 (保留)" type="number" value={closingFloat} onChange={(e:any)=>setClosingFloat(parseFloat(e.target.value))} />
            <Input label="經手人 (Staff)" value={staffName} onChange={(e:any)=>setStaffName(e.target.value)} />
            <div className="flex justify-between border-t border-zinc-800 pt-4"><span className="text-zinc-500 font-bold uppercase tracking-widest">今日提領</span><span className="text-xl font-bold text-white font-mono">{formatCurrency(cashDrop)}</span></div>
            <div className="flex gap-4 pt-4"><Button variant="ghost" onClick={()=>setStep(2)} className="flex-1">上一步</Button><Button onClick={handleFinish} className="flex-[2] h-14 border-2" disabled={(variance!==0&&!reason)||!staffName||isSubmitting}>{isSubmitting ? '⏳ 上傳中...' : '完成結帳'}</Button></div>
          </div>
        )}
      </Card>
    </div>
  );
};

const HistoryView = ({ onNavigate }: any) => {
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { onSnapshot(query(collection(db, 'daily_closings'), orderBy('date', 'desc'), limit(30)), (snap) => setClosings(snap.docs.map(d => ({id: d.id, ...d.data()} as DailyClosing)))); }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader title="HISTORY" subtitle="歷史紀錄" onBack={() => onNavigate('dashboard')} />
      <div className="border-2 border-zinc-800 bg-black">
        {closings.length === 0 && <div className="p-8 text-center text-zinc-500 font-mono">NO RECORDS</div>}
        <div className="divide-y divide-zinc-800">
          {closings.map((c) => (
            <div key={c.id} className="group">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 ${c.variance===0 ? 'bg-zinc-700' : 'bg-white'}`}></div>
                  <div>
                    <h4 className="text-white font-bold text-lg">{formatDate(c.date)}</h4>
                    <p className="text-zinc-500 text-xs font-mono">{c.staff_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold font-mono">{formatCurrency(c.total_cash_sales)}</p>
                  <p className={`text-xs font-bold ${c.variance!==0 ? 'text-white' : 'text-zinc-600'}`}>{c.variance!==0 ? `VAR: ${c.variance}` : 'PERFECT'}</p>
                </div>
                {expandedId === c.id ? <ChevronUp size={16} className="text-zinc-500"/> : <ChevronDown size={16} className="text-zinc-500"/>}
              </div>
              
              {/* 展開詳情 */}
              {expandedId === c.id && (
                <div className="bg-zinc-900/30 p-4 border-t border-zinc-800 text-sm font-mono space-y-2 animate-fade-in">
                  <div className="flex justify-between text-zinc-400"><span>現金營收</span><span>+{formatCurrency(c.total_cash_sales)}</span></div>
                  <div className="flex justify-between text-zinc-400"><span>現金支出</span><span>-{formatCurrency(c.total_cash_expenses)}</span></div>
                  <div className="flex justify-between text-white font-bold pt-2 border-t border-zinc-800"><span>今日提領</span><span>{formatCurrency(c.cash_drop)}</span></div>
                  {c.variance !== 0 && <div className="text-white bg-zinc-800 p-2 mt-2 text-xs">⚠️ 原因：{c.variance_reason}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 🗂️ 點鈔機歷史紀錄頁面
const BillsHistoryView = ({ onNavigate }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('billsHistory') || '[]');
      setHistory(saved.reverse()); // 最新在上面
    } catch (e) {
      showToast('無法讀取歷史紀錄', 'error');
    }
  }, []);

  const handleUpload = async (item: any, index: number) => {
    try {
      // 上傳到 Google Sheet (透過 Firebase 觸發)
      const billsRecord = {
        date: item.date,
        time: item.time,
        bills_json: JSON.stringify(item.bills),
        actual_counted: item.actualCounted,
        closing_float: item.closingFloat,
        variance: item.variance,
        staff_name: item.staffName,
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'bills_history'), billsRecord);
      
      // 更新本地記錄為已同步
      const updated = [...history];
      updated[index].synced = true;
      updated[index].syncTime = new Date().toLocaleTimeString('zh-TW');
      setHistory(updated);
      localStorage.setItem('billsHistory', JSON.stringify(updated.reverse()));
      
      showToast('✅ 已上傳到 Google Sheet', 'success');
    } catch (e) {
      showToast('❌ 上傳失敗：' + (e as any).message, 'error');
    }
  };

  const handleDelete = (index: number) => {
    if (!confirm(`確定要刪除 ${history[index].date} 的點鈔機記錄嗎？`)) return;
    
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    localStorage.setItem('billsHistory', JSON.stringify(updated.reverse()));
    showToast('✅ 已刪除', 'success');
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="BILLS HISTORY" subtitle="點鈔機歷史紀錄" onBack={() => onNavigate('dashboard')} />
      
      <Card className="mb-4">
        <div className="text-xs text-zinc-500 font-mono">
          <p>💡 提示：所有點鈔機記錄會自動保存。</p>
          <p>✅ 確認無誤後，可上傳至 Google Sheet 或手動刪除。</p>
        </div>
      </Card>

      {history.length === 0 ? (
        <Card><div className="text-center text-zinc-600 py-8">無點鈔機記錄</div></Card>
      ) : (
        <div className="space-y-3">
          {history.map((item, index) => (
            <div key={item.date + item.time} className="border-2 border-zinc-800 bg-black">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors"
                onClick={() => setExpandedId(expandedId === (item.date + item.time) ? null : (item.date + item.time))}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 ${item.synced ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div>
                    <h4 className="text-white font-bold">{item.date}</h4>
                    <p className="text-xs text-zinc-500">{item.time} • {item.staffName}</p>
                  </div>
                </div>
                <span className="text-white font-mono font-bold">{formatCurrency(item.actualCounted)}</span>
              </div>

              {expandedId === (item.date + item.time) && (
                <div className="bg-zinc-900/30 p-4 border-t border-zinc-800 text-sm font-mono space-y-2 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(item.bills).map(([denom, count]: [string, any]) => (
                      count > 0 && (
                        <div key={denom} className="flex justify-between text-zinc-400">
                          <span>${denom}</span>
                          <span>{count}x = {formatCurrency(parseInt(denom) * count)}</span>
                        </div>
                      )
                    ))}
                  </div>
                  
                  <div className="border-t border-zinc-800 pt-2 mt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-zinc-400">實際點算</span><span className="text-white">{formatCurrency(item.actualCounted)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">明日保留</span><span className="text-white">{formatCurrency(item.closingFloat)}</span></div>
                    <div className={`flex justify-between ${item.variance === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                      <span>差異</span><span>{item.variance > 0 ? '+' : ''}{item.variance}</span>
                    </div>
                  </div>

                  {item.synced && (
                    <div className="text-[10px] text-green-500 pt-2 border-t border-zinc-800">
                      ✓ 已同步 {item.syncTime}
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-zinc-800">
                    {!item.synced && (
                      <Button 
                        onClick={() => handleUpload(item, index)}
                        className="flex-1 text-xs"
                        variant="secondary"
                      >
                        📤 上傳 Google Sheet
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleDelete(index)}
                      className="flex-1 text-xs"
                      variant="danger"
                    >
                      🗑️ 刪除
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ currentConfig, onSave, onCancel }: any) => {
  const [config, setConfig] = useState(currentConfig);
  const [pin, setPin] = useState(""); 
  const { showToast } = useToast();
  
  const handleSave = async () => {
    await setDoc(doc(db, 'settings', 'fees'), { rates: config, admin_pin: pin || "8888", updated_at: serverTimestamp() });
    showToast('設定已儲存', 'success');
    onSave(config);
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <PageHeader title="SETUP" subtitle="系統設定" onBack={onCancel} />
      <Card>
        <div className="space-y-6">
          <div className="space-y-4">{(Object.keys(DEFAULT_FEE_CONFIG) as string[]).map(k => (
            <div key={k} className="flex justify-between items-center"><label className="font-bold text-white text-sm tracking-wider">{CHANNEL_LABELS[k]||k}</label><div className="flex items-center"><input type="number" step="0.1" value={((config[k]||0)*100).toFixed(1)} onChange={e=>setConfig({...config, [k]: parseFloat(e.target.value)/100})} className="w-16 bg-black text-right text-white border-b border-zinc-800 focus:outline-none font-mono text-lg"/><span className="ml-2 text-zinc-500">%</span></div></div>
          ))}</div>
          <div className="pt-6 border-t border-zinc-800 mt-6"><label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">店長 PIN 碼</label><input type="text" value={pin} placeholder="預設 8888" onChange={e=>setPin(e.target.value)} className="w-full bg-black border-b-2 border-zinc-800 py-2 text-white font-mono text-lg mt-2 focus:border-white focus:outline-none" /></div>
          <div className="flex gap-4 pt-6"><Button variant="secondary" onClick={onCancel} className="flex-1 border-2">取消</Button><Button onClick={handleSave} className="flex-1 border-2">儲存</Button></div>
        </div>
      </Card>
    </div>
  );
};

const PageHeader = ({ title, subtitle, onBack }: any) => (
  <div className="flex items-center justify-between mb-8 border-b-2 border-zinc-900 pb-4">
    <div className="flex items-center gap-4">
      {onBack && <button onClick={onBack} className="p-2 hover:bg-zinc-900 text-white transition-colors"><ArrowRight className="rotate-180" size={24} /></button>}
      <div><h2 className="text-3xl font-bold text-white tracking-tighter uppercase">{title}</h2>{subtitle && <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">{subtitle}</p>}</div>
    </div>
  </div>
);

// V4: PIN Modal
const PinModal = ({ isOpen, onClose, onVerify, title = "需要授權" }: any) => {
  const [pin, setPin] = useState("");
  if (!isOpen) return null;
  const handleNum = (n: string) => { if (pin.length < 4) setPin(prev => prev + n); };
  const handleVerify = () => { onVerify(pin); setPin(""); };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xs bg-black border-2 border-zinc-800 p-6 space-y-6 shadow-2xl shadow-zinc-900">
        <div className="text-center"><Lock className="mx-auto text-zinc-500 mb-2" size={32} /><h3 className="text-white font-bold text-lg tracking-widest">{title}</h3></div>
        <div className="flex justify-center gap-4 my-4">{[0, 1, 2, 3].map(i => (<div key={i} className={`w-3 h-3 rounded-full ${i < pin.length ? 'bg-white' : 'bg-zinc-800'}`} />))}</div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (<button key={n} onClick={() => handleNum(n.toString())} className="h-16 border border-zinc-800 text-white text-2xl font-mono active:bg-zinc-800 hover:border-zinc-600 transition-colors">{n}</button>))}
          <button onClick={() => setPin("")} className="h-16 border border-zinc-800 text-red-500 font-bold active:bg-zinc-800 hover:border-red-900">CLR</button>
          <button onClick={() => handleNum("0")} className="h-16 border border-zinc-800 text-white text-2xl font-mono active:bg-zinc-800 hover:border-zinc-600">0</button>
          <button onClick={handleVerify} className="h-16 bg-white text-black font-bold active:bg-zinc-200 hover:bg-zinc-100">OK</button>
        </div>
        <button onClick={onClose} className="w-full py-3 text-zinc-500 text-sm hover:text-white uppercase tracking-widest">Cancel</button>
      </div>
    </div>
  );
};

// --- App Shell ---
const App = () => {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [lastClosingFloat, setLastClosingFloat] = useState(5110);
  const [feeConfig, setFeeConfig] = useState(DEFAULT_FEE_CONFIG);
  const [adminPin, setAdminPin] = useState("8888"); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<any>(null);
  
  // Toast State
  const [toasts, setToasts] = useState<any[]>([]);
  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  useEffect(() => {
    const initAuth = async () => { await signInAnonymously(auth); };
    initAuth();
    onAuthStateChanged(auth, setUser);
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
    return () => { window.removeEventListener('online', () => {}); window.removeEventListener('offline', () => {}); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const today = getTodayString();
    
    const unsubTx = onSnapshot(query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)).filter(t => {
        const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp?.seconds * 1000);
        return d.toISOString().split('T')[0] === today;
      }));
    });

    const unsubExp = onSnapshot(query(collection(db, 'expenses'), orderBy('created_at', 'desc'), limit(100)), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)).filter(e => e.date === today));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'fees'), (doc) => {
       if (doc.exists()) {
         setFeeConfig(doc.data().rates);
         if(doc.data().admin_pin) setAdminPin(doc.data().admin_pin);
       }
    });

    getDocs(query(collection(db, 'daily_closings'), orderBy('timestamp', 'desc'), limit(1))).then(snap => {
      if (!snap.empty) setLastClosingFloat(snap.docs[0].data().closing_float);
    });

    return () => { unsubTx(); unsubExp(); unsubSettings(); };
  }, [user]);

  const handleVoidRequest = (item: any) => { setTargetItem(item); setPinModalOpen(true); };
  const executeVoid = async (pinInput: string) => {
    if (pinInput !== adminPin) return showToast("❌ PIN 碼錯誤", 'error');
    try {
      const collName = targetItem.type === 'INCOME' ? 'transactions' : 'expenses';
      const docRef = doc(db, collName, targetItem.id);
      await updateDoc(docRef, { status: 'VOID', voided_at: serverTimestamp() });
      setPinModalOpen(false); setTargetItem(null); showToast("已作廢", 'success');
    } catch (e) { showToast("操作失敗", 'error'); }
  };

  if (!user) return <div className="h-screen flex items-center justify-center bg-black text-white font-mono text-xs tracking-widest">SYSTEM INITIALIZING...</div>;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className="min-h-screen bg-black font-sans text-zinc-300 selection:bg-white selection:text-black">
        <header className="sticky top-0 z-20 bg-black/90 border-b-2 border-zinc-800 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setView('dashboard')}>
              <div className="w-10 h-10 bg-white flex items-center justify-center"><div className="w-5 h-5 bg-black" /></div>
              <div><h1 className="font-bold text-xl text-white leading-none tracking-tighter">moon_moon_dessert</h1><div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">POS V5.0</span>{isOnline ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-red-500" />}</div></div>
            </div>
            <div className="flex items-center gap-4"><div className="hidden md:flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-xs font-mono text-zinc-500">{getTodayString()}</span></div><button onClick={() => setView('settings')} className="p-2 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"><Settings size={24} /></button></div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-12">
          {view === 'dashboard' && <Dashboard transactions={transactions} expenses={expenses} lastClosingFloat={lastClosingFloat} feeConfig={feeConfig} onNavigate={setView} onVoidItem={handleVoidRequest} />}
          {view === 'income' && <IncomeForm feeConfig={feeConfig} onCancel={() => setView('dashboard')} onSuccess={() => setView('dashboard')} />}
          {view === 'expense' && <ExpenseForm onCancel={() => setView('dashboard')} onSuccess={() => setView('dashboard')} />}
          {view === 'closing' && <ClosingWizard transactions={transactions} expenses={expenses} lastClosingFloat={lastClosingFloat} onCancel={() => setView('dashboard')} onSuccess={() => setView('dashboard')} />}
          {view === 'history' && <HistoryView onNavigate={setView} />}
          {view === 'billsHistory' && <BillsHistoryView onNavigate={setView} />}
          {view === 'settings' && <SettingsView currentConfig={feeConfig} onSave={(c:any) => { setFeeConfig(c); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        </main>
        <PinModal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} onVerify={executeVoid} />
        <ToastContainer toasts={toasts} />
      </div>
    </ToastContext.Provider>
  );
};

export default App;