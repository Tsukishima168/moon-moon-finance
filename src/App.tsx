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
  getDoc,
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
    // 🔒 確保與 ClosingWizard 使用相同的過濾邏輯
    const today = getTodayString();
    const validTx = transactions.filter((t: any) => {
      // 只計算今天的有效交易
      const txDate = t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : 
                     (t.timestamp?.seconds ? new Date(t.timestamp.seconds * 1000).toISOString().split('T')[0] : '');
      return txDate === today && t.status !== 'VOID' && t.status !== 'CLOSED';
    });
    const validExp = expenses.filter((e: any) => e.date === today && e.status !== 'VOID' && e.status !== 'CLOSED');
    
    const gross = validTx.reduce((sum: number, t: any) => sum + t.amount, 0);
    const fees = validTx.reduce((sum: number, t: any) => sum + t.fee_amount, 0);
    const exp = validExp.reduce((sum: number, e: any) => sum + e.amount, 0);
    
    // 🔒 只計算 CASH 渠道（與 ClosingWizard 一致）
    const cashSales = validTx.filter((t: any) => t.channel === 'CASH').reduce((sum: number, t: any) => sum + t.amount, 0);
    // 🔒 只計算從錢櫃支出的（與 ClosingWizard 一致）
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

// ==========================================
// 🔧 改進版 ClosingWizard - 完整金額計算驗證
// ==========================================
const ClosingWizard = ({ transactions, expenses, onCancel, onSuccess, lastClosingFloat }: any) => {
  const [step, setStep] = useState(1);
  const [openingFloat, setOpeningFloat] = useState(lastClosingFloat || 5110);
  const [closingFloat, setClosingFloat] = useState(5110);
  const [actualCounted, setActualCounted] = useState(0);
  
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
  
  // 🎯 新增：詳細的調試信息面板
  const [showDebug, setShowDebug] = useState(false);
  
  const { showToast } = useToast();

  useEffect(() => {
    localStorage.setItem('billsBackup', JSON.stringify(bills));
  }, [bills]);

  const saveBillsHistory = (historyData: any) => {
    try {
      const history = JSON.parse(localStorage.getItem('billsHistory') || '[]');
      history.push(historyData);
      localStorage.setItem('billsHistory', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save bills history:', e);
    }
  };

  // ==========================================
  // 🎯 關鍵修復：只計算現金相關的金額（過濾其他渠道）
  // ==========================================
  
  // 1️⃣ 現金營收（ONLY CASH）
  const cashSales = useMemo(() => {
    const today = getTodayString(); // 使用統一的日期格式 yyyy-MM-dd
    const valid = transactions.filter((t: any) => {
      // 🔧 修復：使用統一的日期比較方式（避免時區問題）
      let txDate = '';
      if (t.timestamp?.toDate) {
        txDate = t.timestamp.toDate().toISOString().split('T')[0];
      } else if (t.timestamp?.seconds) {
        txDate = new Date(t.timestamp.seconds * 1000).toISOString().split('T')[0];
      } else {
        return false; // 沒有時間戳，跳過
      }
      
      const isToday = txDate === today;
      const isCash = t.channel === 'CASH';
      const isValid = t.status === 'VALID';
      const isIncome = t.type === 'INCOME';
      
      return (
        isCash &&           // ✅ 只要現金（排除 LINEPAY, UBER, GOOGLE, TRANSFER）
        isValid &&          // ✅ 只要有效交易（排除 VOID, CLOSED）
        isToday &&          // ✅ 只要今天的
        isIncome            // ✅ 只要收入
      );
    });
    const sum = valid.reduce((a: number, c: any) => a + c.amount, 0);
    
    // 📍 調試信息（幫助排查問題）
    console.log('🔍 現金營收計算（只算 CASH）：', {
      今天日期: today,
      總交易數: transactions.length,
      現金交易數: valid.length,
      交易詳情: valid.map((t: any) => ({ 
        金額: t.amount, 
        渠道: t.channel, 
        狀態: t.status,
        日期: t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : 'N/A'
      })),
      合計: sum,
      排除的交易: transactions.filter((t: any) => {
        const txDate = t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : '';
        return txDate === today && t.channel !== 'CASH' && t.status === 'VALID' && t.type === 'INCOME';
      }).map((t: any) => ({ 渠道: t.channel, 金額: t.amount }))
    });
    
    return sum;
  }, [transactions]);

  // 2️⃣ 現金支出（ONLY 從錢櫃支出）
  const cashExpenses = useMemo(() => {
    const valid = expenses.filter((e: any) => {
      const isToday = e.date === new Date().toISOString().split('T')[0];
      return (
        e.source === 'DRAWER' &&      // ✅ 只要從錢櫃支出
        e.status === 'VALID' &&       // ✅ 只要有效
        isToday                       // ✅ 只要今天的
      );
    });
    const sum = valid.reduce((a: number, c: any) => a + c.amount, 0);
    
    console.log('🔍 現金支出計算：', {
      交易筆數: valid.length,
      交易詳情: valid.map((e: any) => ({ 
        項目: e.item, 
        金額: e.amount, 
        來源: e.source, 
        狀態: e.status 
      })),
      合計: sum
    });
    
    return sum;
  }, [expenses]);

  // 3️⃣ 系統應有現金 = 開店金 + 現金營收 - 現金支出
  const expectedDrawer = useMemo(() => {
    return openingFloat + cashSales - cashExpenses;
  }, [openingFloat, cashSales, cashExpenses]);

  // 4️⃣ 實際點算金額（從鈔票計算）
  const calculatedActualCounted = useMemo(() => {
    const sum = Object.keys(bills).reduce((acc, denom) => {
      return acc + parseInt(denom) * bills[denom];
    }, 0);
    return sum;
  }, [bills]);

  // 5️⃣ 差異 = 實際 - 應有
  const variance = useMemo(() => {
    return calculatedActualCounted - expectedDrawer;
  }, [calculatedActualCounted, expectedDrawer]);

  // 6️⃣ 今日提領 = 實際 - 明日保留
  const cashDrop = useMemo(() => {
    return calculatedActualCounted - closingFloat;
  }, [calculatedActualCounted, closingFloat]);

  // ==========================================
  // 🎯 重要！自動同步實際點算金額
  // ==========================================
  useEffect(() => {
    setActualCounted(calculatedActualCounted);
  }, [calculatedActualCounted]);

  const handleFinish = async () => {
    // 驗證
    if (step === 3 && ((variance !== 0 && !reason) || !staffName)) {
      return showToast('請填寫差異原因與經手人', 'error');
    }
    
    // 🎯 新增：最後檢查提醒（防止誤操作）
    if (Math.abs(variance) > 500) {
      const shouldContinue = confirm(
        `⚠️ 警告：現金差異為 ${variance} 元，超過 500 元！\n` +
        `應有：${formatCurrency(expectedDrawer)}\n` +
        `實際：${formatCurrency(calculatedActualCounted)}\n\n` +
        `請確認點鈔無誤後再按確定。`
      );
      if (!shouldContinue) return;
    }

    setIsSubmitting(true);
    try {
      const today = getTodayString();
      
      // 🎯 清晰的計算紀錄
      const closingPayload = {
        date: today,
        opening_float: openingFloat,
        
        // 💰 現金流明細（只含現金）
        total_cash_sales: cashSales,
        total_cash_expenses: cashExpenses,
        
        // 📊 計算過程
        expected_drawer: expectedDrawer,
        actual_counted: calculatedActualCounted,
        variance: variance,
        variance_reason: reason,
        
        // 💵 提領
        cash_drop: cashDrop,
        closing_float: closingFloat,
        staff_name: staffName,
        status: 'COMPLETED',
        timestamp: serverTimestamp(),
        
        // 🎯 新增：詳細計算過程（用於審計）
        calculation_detail: {
          cash_sales_count: transactions.filter((t: any) => 
            t.channel === 'CASH' && t.status === 'VALID' && t.type === 'INCOME'
          ).length,
          cash_expense_count: expenses.filter((e: any) => 
            e.source === 'DRAWER' && e.status === 'VALID'
          ).length,
          bills_breakdown: bills,  // ✅ 鈔票組成
          notes: 'Only CASH channel included'
        }
      };
      
      const batch = writeBatch(db);
      
      // 保存日結記錄
      const closingRef = doc(db, 'daily_closings', today);
      
      // 🎯 新增：防止重複日結
      const existing = await getDoc(closingRef);
      if (existing.exists()) {
        showToast('❌ 今日已日結，無法重複操作', 'error');
        setIsSubmitting(false);
        return;
      }
      
      batch.set(closingRef, { ...closingPayload, closed_at: serverTimestamp(), finalized: true });
      
      // 保存點鈔機歷史
      saveBillsHistory({
        date: today,
        time: new Date().toLocaleTimeString('zh-TW'),
        bills: bills,
        actualCounted: calculatedActualCounted,
        closingFloat: closingFloat,
        variance: variance,
        staffName: staffName,
        synced: false,
        syncTime: null,
        
        // 🎯 新增：計算明細
        calculationDetail: {
          cashSales: cashSales,
          cashExpenses: cashExpenses,
          expectedDrawer: expectedDrawer
        }
      });
      
      // 標記當日交易為 CLOSED
      const txCol = collection(db, 'transactions');
      const txSnap = await getDocs(query(txCol, orderBy('timestamp', 'desc'), limit(500)));
      txSnap.forEach((docSnap: any) => {
        const tx = docSnap.data();
        const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp?.seconds * 1000);
        const txDateStr = txDate.toISOString().split('T')[0];
        if (txDateStr === today && tx.status === 'VALID') {
          const docRef = doc(db, 'transactions', docSnap.id);
          batch.update(docRef, { status: 'CLOSED', closed_at: serverTimestamp() });
        }
      });
      
      // 標記當日支出為 CLOSED
      const expCol = collection(db, 'expenses');
      const expSnap = await getDocs(query(expCol, orderBy('created_at', 'desc'), limit(500)));
      expSnap.forEach((docSnap: any) => {
        const exp = docSnap.data();
        if (exp.date === today && exp.status === 'VALID') {
          const docRef = doc(db, 'expenses', docSnap.id);
          batch.update(docRef, { status: 'CLOSED', closed_at: serverTimestamp() });
        }
      });
      
      await batch.commit();
      
      localStorage.removeItem('billsBackup');
      showToast('✅ 日結完成！資料已上傳 Firebase', 'success');
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
            {/* 🎯 Step 1：現金流驗證 */}
            <div className="p-4 bg-zinc-900/50 border-2 border-yellow-900 rounded">
              <h4 className="font-bold text-yellow-500 mb-3">⚠️ 現金流驗證（只包含 CASH）</h4>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between"><span className="text-zinc-400">開店金</span><span className="text-white">{formatCurrency(openingFloat)}</span></div>
                <div className="flex justify-between text-green-500"><span>+ 現金營收</span><span>{formatCurrency(cashSales)}</span></div>
                <div className="flex justify-between text-red-500"><span>- 現金支出</span><span>{formatCurrency(cashExpenses)}</span></div>
                <div className="h-px bg-zinc-700 my-2"></div>
                <div className="flex justify-between font-bold text-lg text-white"><span>= 系統應有</span><span>{formatCurrency(expectedDrawer)}</span></div>
              </div>
            </div>

            {/* 調試按鈕 */}
            <Button 
              onClick={() => setShowDebug(!showDebug)} 
              variant="ghost"
              className="w-full text-xs"
            >
              {showDebug ? '🔽 隱藏調試信息' : '🔎 顯示調試信息'}
            </Button>

            {/* 調試面板 */}
            {showDebug && (
              <div className="p-3 bg-black border-2 border-zinc-700 rounded text-[10px] font-mono space-y-2 max-h-64 overflow-y-auto">
                <div className="text-zinc-400">
                  <div className="font-bold text-blue-400">✅ 現金營收交易（只算 CASH）：</div>
                  {cashSales === 0 ? (
                    <div className="text-zinc-600">無現金交易</div>
                  ) : (
                    transactions
                      .filter((t: any) => {
                        const today = getTodayString();
                        const txDate = t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : '';
                        return t.channel === 'CASH' && t.status === 'VALID' && t.type === 'INCOME' && txDate === today;
                      })
                      .map((t: any, i: number) => (
                        <div key={i} className="text-green-600">
                          {i + 1}. {formatCurrency(t.amount)} (CASH)
                        </div>
                      ))
                  )}
                </div>

                <div className="text-zinc-400">
                  <div className="font-bold text-orange-400">⚠️ 被排除的非現金交易（不計入現金）：</div>
                  {transactions.filter((t: any) => {
                    const today = getTodayString();
                    const txDate = t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : '';
                    return t.channel !== 'CASH' && t.status === 'VALID' && t.type === 'INCOME' && txDate === today;
                  }).length === 0 ? (
                    <div className="text-zinc-600">無</div>
                  ) : (
                    transactions
                      .filter((t: any) => {
                        const today = getTodayString();
                        const txDate = t.timestamp?.toDate ? t.timestamp.toDate().toISOString().split('T')[0] : '';
                        return t.channel !== 'CASH' && t.status === 'VALID' && t.type === 'INCOME' && txDate === today;
                      })
                      .map((t: any, i: number) => (
                        <div key={i} className="text-orange-500">
                          {i + 1}. {formatCurrency(t.amount)} ({t.channel}) - 已排除
                        </div>
                      ))
                  )}
                </div>

                <div className="text-zinc-400">
                  <div className="font-bold text-red-400">✅ 現金支出交易（只算 DRAWER）：</div>
                  {expenses.filter((e: any) => {
                    const today = getTodayString();
                    return e.source === 'DRAWER' && e.status === 'VALID' && e.date === today;
                  }).length === 0 ? (
                    <div className="text-zinc-600">無支出</div>
                  ) : (
                    expenses
                      .filter((e: any) => {
                        const today = getTodayString();
                        return e.source === 'DRAWER' && e.status === 'VALID' && e.date === today;
                      })
                      .map((e: any, i: number) => (
                        <div key={i} className="text-red-600">
                          {i + 1}. -{formatCurrency(e.amount)} ({e.item})
                        </div>
                      ))
                  )}
                </div>

                <div className="text-zinc-400 pt-2 border-t border-zinc-700">
                  <div className="font-bold text-yellow-400">計算驗證：</div>
                  <div>開店金 {openingFloat} + 現金營收 {cashSales} - 現金支出 {cashExpenses} = 應有 {expectedDrawer} ✓</div>
                  <div className="text-xs text-zinc-500 mt-1">⚠️ 注意：只計算 CASH 渠道，LINEPAY/UBER/GOOGLE/TRANSFER 不計入現金</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-black border-2 border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase">開店金</p>
                <input 
                  type="number" 
                  value={openingFloat} 
                  onChange={e => setOpeningFloat(parseFloat(e.target.value))}
                  className="w-full bg-black text-white text-xl border-b border-zinc-800 focus:outline-none mt-2"
                />
              </div>
              <div className="p-4 bg-white text-black border-2 border-white">
                <p className="text-xs font-bold uppercase">系統應有</p>
                <p className="text-2xl font-bold font-mono mt-2">{formatCurrency(expectedDrawer)}</p>
              </div>
            </div>
            <Button onClick={() => setStep(2)} className="w-full mt-4 h-14 border-2" variant="secondary">下一步：點鈔</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between border-b-2 border-zinc-800 pb-2">
              <h3 className="text-lg font-bold">點算現金</h3>
              <p className="text-2xl font-mono text-white">{formatCurrency(calculatedActualCounted)}</p>
            </div>
            
            {/* 鈔票計數器 */}
            <div className="grid grid-cols-2 gap-4">
              {[1000, 500, 100, 50, 10, 5, 1].map(d => (
                <div key={d} className="flex justify-between items-center border-b border-zinc-900 pb-1">
                  <span className="text-zinc-500 w-12 font-mono">{d}</span>
                  <div className="flex items-center text-white gap-2">
                    <button 
                      onClick={() => setBills((b: any) => ({...b, [d]: Math.max(0, b[d]-1)}))} 
                      className="w-8 h-8 flex items-center justify-center border border-zinc-800 active:bg-zinc-800"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      className="w-12 bg-black text-center text-white focus:outline-none border-b-2 border-zinc-800 focus:border-white"
                      value={bills[d]} 
                      onChange={e => setBills({...bills, [d]: parseInt(e.target.value)||0})}
                    />
                    <button 
                      onClick={() => setBills((b: any) => ({...b, [d]: b[d]+1}))} 
                      className="w-8 h-8 flex items-center justify-center border border-zinc-800 active:bg-zinc-800"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 步驟按鈕 */}
            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">上一步</Button>
              <Button onClick={() => setStep(3)} className="flex-[2] h-14 border-2" variant="secondary">下一步</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            {/* 最終驗證 */}
            <div className={`p-6 text-center border-2 ${Math.abs(variance) > 500 ? 'border-red-900 bg-red-900/20' : variance === 0 ? 'border-green-900 bg-green-900/20' : 'border-yellow-900 bg-yellow-900/20'}`}>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">現金差異</p>
              <h2 className={`text-4xl font-bold my-2 font-mono ${variance > 0 ? 'text-green-400' : variance < 0 ? 'text-red-400' : 'text-white'}`}>
                {variance > 0 ? '+' : ''}{variance}
              </h2>
              <div className="text-xs text-zinc-400 space-y-1 pt-2 border-t border-current">
                <div>應有: {formatCurrency(expectedDrawer)}</div>
                <div>實際: {formatCurrency(calculatedActualCounted)}</div>
              </div>
            </div>

            {variance !== 0 && (
              <div className="animate-pulse-once">
                <Input 
                  label="差異原因 (必填)" 
                  value={reason} 
                  onChange={(e: any) => setReason(e.target.value)}
                  placeholder="例：零錢不足、客人多算..."
                />
              </div>
            )}
            
            <Input label="明日找零 (保留)" type="number" value={closingFloat} onChange={(e: any) => setClosingFloat(parseFloat(e.target.value))} />
            <Input label="經手人 (Staff)" value={staffName} onChange={(e: any) => setStaffName(e.target.value)} />
            
            <div className="flex justify-between border-t border-zinc-800 pt-4">
              <span className="text-zinc-500 font-bold uppercase tracking-widest">今日提領</span>
              <span className="text-xl font-bold text-white font-mono">{formatCurrency(cashDrop)}</span>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">上一步</Button>
              <Button 
                onClick={handleFinish} 
                className="flex-[2] h-14 border-2" 
                disabled={(variance !== 0 && !reason) || !staffName || isSubmitting}
              >
                {isSubmitting ? '⏳ 上傳中...' : '✅ 完成結帳'}
              </Button>
            </div>
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

const SettingsView = ({ currentConfig, onSave, onCancel }: any) => {
  const [config, setConfig] = useState(currentConfig);
  const { showToast } = useToast();
  
  const handleSave = async () => {
    // 僅儲存費率設定，不再儲存任何 PIN 資訊到 Firestore
    await setDoc(doc(db, 'settings', 'fees'), { rates: config, updated_at: serverTimestamp() });
    showToast('設定已儲存', 'success');
    onSave(config);
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <PageHeader title="SETUP" subtitle="系統設定" onBack={onCancel} />
      <Card>
        <div className="space-y-6">
          <div className="space-y-4">
            {(Object.keys(DEFAULT_FEE_CONFIG) as string[]).map(k => (
              <div key={k} className="flex justify-between items-center">
                <label className="font-bold text-white text-sm tracking-wider">
                  {CHANNEL_LABELS[k] || k}
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    value={((config[k] || 0) * 100).toFixed(1)}
                    onChange={e => setConfig({ ...config, [k]: parseFloat(e.target.value) / 100 })}
                    className="w-16 bg-black text-right text-white border-b border-zinc-800 focus:outline-none font-mono text-lg"
                  />
                  <span className="ml-2 text-zinc-500">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 pt-6">
            <Button variant="secondary" onClick={onCancel} className="flex-1 border-2">
              取消
            </Button>
            <Button onClick={handleSave} className="flex-1 border-2">
              儲存
            </Button>
          </div>
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
       }
    });

    getDocs(query(collection(db, 'daily_closings'), orderBy('timestamp', 'desc'), limit(1))).then(snap => {
      if (!snap.empty) setLastClosingFloat(snap.docs[0].data().closing_float);
    });

    return () => { unsubTx(); unsubExp(); unsubSettings(); };
  }, [user]);

  const handleVoidRequest = (item: any) => { setTargetItem(item); setPinModalOpen(true); };
  const executeVoid = async (pinInput: string) => {
    // 改為呼叫後端 API 驗證 PIN，不在前端保存或比對真正的 PIN 值
    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });

      if (!res.ok) {
        showToast("PIN 驗證失敗", 'error');
        return;
      }

      const data = await res.json();
      if (!data || !data.valid) {
        showToast("❌ PIN 碼錯誤", 'error');
        return;
      }

      const collName = targetItem.type === 'INCOME' ? 'transactions' : 'expenses';
      const docRef = doc(db, collName, targetItem.id);
      await updateDoc(docRef, { status: 'VOID', voided_at: serverTimestamp() });
      setPinModalOpen(false);
      setTargetItem(null);
      showToast("已作廢", 'success');
    } catch (e) {
      showToast("PIN 驗證服務錯誤，請稍後再試", 'error');
    }
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
          {view === 'settings' && <SettingsView currentConfig={feeConfig} onSave={(c:any) => { setFeeConfig(c); setView('dashboard'); }} onCancel={() => setView('dashboard')} />}
        </main>
        <PinModal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} onVerify={executeVoid} />
        <ToastContainer toasts={toasts} />
      </div>
    </ToastContext.Provider>
  );
};

export default App;