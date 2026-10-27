import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import QuickInputModal from './components/QuickInputModal';
import HistoryView from './components/HistoryView';
import WalletsView from './components/WalletsView';
import CategoriesView from './components/CategoriesView';
import DebtsView from './components/DebtsView';
import ReportsView from './components/ReportsView';
import Toast from './components/Toast';
import {
  fetchAppData,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addWallet,
  updateWallet,
  deleteWallet,
  addCategory,
  updateCategory,
  deleteCategory,
  addDebt,
  updateDebt,
  deleteDebt,
  payDebt,
} from './services/api';
import { RefreshCw, ExternalLink, X } from 'lucide-react';
import { formatRupiah, formatDateIndo } from './utils/formatters';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeActor, setActiveActor] = useState(
    () => localStorage.getItem('fmt_actor') || 'Suami'
  );

  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedReceiptTrx, setSelectedReceiptTrx] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
  };

  // Helper simpan debts ke localStorage
  const saveDebtsToStorage = (newDebts) => {
    try {
      localStorage.setItem('fmt_debts', JSON.stringify(newDebts));
    } catch {}
  };

  // Helper sanitasi data tagihan & cicilan (memperbaiki jika ada data lama yang salah input nominal)
  const sanitizeDebts = (rawDebts) => {
    if (!Array.isArray(rawDebts)) return [];
    return rawDebts.map((d) => {
      if (d.type === 'BILL') {
        const billAmt =
          Number(d.total_amount) > 100
            ? Number(d.total_amount)
            : Number(d.installment_amount) || Number(d.total_amount) || 0;
        return {
          ...d,
          total_amount: billAmt,
          installment_amount: billAmt,
          remaining_amount: billAmt,
        };
      }
      return d;
    });
  };

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAppData();
      setWallets(data.wallets || []);
      setCategories(data.categories || []);
      setTransactions(data.transactions || []);
      const cleanDebts = sanitizeDebts(data.debts || []);
      setDebts(cleanDebts);
      saveDebtsToStorage(cleanDebts);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const fetchInitialData = async () => {
      try {
        const data = await fetchAppData();
        if (!ignore) {
          setWallets(data.wallets || []);
          setCategories(data.categories || []);
          setTransactions(data.transactions || []);
          const cleanDebts = sanitizeDebts(data.debts || []);
          setDebts(cleanDebts);
          saveDebtsToStorage(cleanDebts);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleActor = (role) => {
    setActiveActor(role);
    localStorage.setItem('fmt_actor', role);
  };

  // Helper untuk menghitung ulang saldo kantong secara instan di browser
  const recalculateWallets = (currentWallets, currentTrxs) => {
    return currentWallets.map((w) => {
      let currentBalance = Number(w.initial_balance) || 0;
      let totalIn = 0;
      let totalOut = 0;
      currentTrxs.forEach((t) => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'INCOME' && t.to_wallet_id === w.id) {
          currentBalance += amt;
          totalIn += amt;
        } else if (t.type === 'EXPENSE' && t.from_wallet_id === w.id) {
          currentBalance -= amt;
          totalOut += amt;
        } else if (t.type === 'TRANSFER') {
          if (t.from_wallet_id === w.id) {
            currentBalance -= amt;
            totalOut += amt;
          }
          if (t.to_wallet_id === w.id) {
            currentBalance += amt;
            totalIn += amt;
          }
        }
      });
      return { ...w, current_balance: currentBalance, total_in: totalIn, total_out: totalOut };
    });
  };

  // CRUD TRANSAKSI (OPTIMISTIC & INSTANT)
  const handleSaveTransaction = async (payload) => {
    if (payload.id) {
      // 1. Mode Edit: Update instan di memori
      const updatedTrxs = transactions.map((t) =>
        t.id === payload.id ? { ...t, ...payload } : t
      );
      setTransactions(updatedTrxs);
      setWallets((prevWallets) => recalculateWallets(prevWallets, updatedTrxs));
      showToast('Transaksi Diperbarui', 'Perubahan transaksi berhasil disimpan dan saldo telah diperbarui.', 'success');

      // 2. Kirim ke GAS di background
      setIsSyncing(true);
      try {
        const res = await updateTransaction(payload);
        if (res?.receipt_url) {
          setTransactions((prev) =>
            prev.map((t) =>
              t.id === payload.id
                ? {
                    ...t,
                    receipt_url: res.receipt_url,
                    receipt_file_id: res.receipt_file_id || t.receipt_file_id,
                  }
                : t
            )
          );
        }
      } catch (err) {
        setError('Gagal memperbarui transaksi di server: ' + err.message);
        loadData();
      } finally {
        setIsSyncing(false);
      }
    } else {
      // 1. Mode Tambah: Buat transaksi sementara & update instan
      const tempId = 'trx-' + Date.now();
      const newTrx = {
        id: tempId,
        date: payload.date,
        type: payload.type,
        amount: Number(payload.amount),
        category_id: payload.category_id || '',
        from_wallet_id: payload.from_wallet_id || '',
        to_wallet_id: payload.to_wallet_id || '',
        actor: payload.actor || activeActor,
        notes: payload.notes || '',
        receipt_url: payload.receipt_base64 || '',
        created_at: new Date().toISOString(),
      };

      const updatedTrxs = [newTrx, ...transactions];
      setTransactions(updatedTrxs);
      setWallets((prevWallets) => recalculateWallets(prevWallets, updatedTrxs));
      showToast('Transaksi Berhasil Dicatat', `${payload.type === 'EXPENSE' ? 'Pengeluaran' : payload.type === 'INCOME' ? 'Pemasukan' : 'Transfer'} sebesar ${formatRupiah(payload.amount)} tersimpan.`, 'success');

      // 2. Kirim ke GAS di background
      setIsSyncing(true);
      try {
        const res = await addTransaction(payload);
        if (res?.id) {
          setTransactions((prev) =>
            prev.map((t) =>
              t.id === tempId
                ? {
                    ...t,
                    id: res.id,
                    receipt_url: res.receipt_url || t.receipt_url,
                    receipt_file_id: res.receipt_file_id || t.receipt_file_id,
                  }
                : t
            )
          );
        }
      } catch (err) {
        setError('Gagal menyimpan transaksi ke Google Sheets: ' + err.message);
        loadData();
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleDeleteTransaction = async (id) => {
    // 1. Hapus instan dari state & hitung ulang saldo
    const updatedTrxs = transactions.filter((t) => t.id !== id);
    setTransactions(updatedTrxs);
    setWallets((prevWallets) => recalculateWallets(prevWallets, updatedTrxs));
    showToast('Transaksi Dihapus', 'Data transaksi telah dihapus dan saldo kantong disesuaikan kembali.', 'info');

    // 2. Hapus di GAS di background
    setIsSyncing(true);
    try {
      await deleteTransaction(id);
    } catch (err) {
      setError('Gagal menghapus transaksi dari server: ' + err.message);
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  // CRUD KANTONG (OPTIMISTIC & INSTANT)
  const handleAddWallet = async (payload) => {
    const tempId = 'w-' + Date.now();
    const newWallet = {
      id: tempId,
      name: payload.name,
      type: payload.type || 'Bank',
      initial_balance: Number(payload.initial_balance) || 0,
      current_balance: Number(payload.initial_balance) || 0,
      total_in: 0,
      total_out: 0,
      color: payload.color || 'blue',
      is_active: true,
    };

    // Tambah instan ke UI
    setWallets((prev) => [...prev, newWallet]);
    showToast('Kantong Ditambahkan', `Kantong "${payload.name}" berhasil dibuat.`, 'success');

    // Kirim di background
    setIsSyncing(true);
    try {
      const res = await addWallet(payload);
      if (res?.id) {
        setWallets((prev) =>
          prev.map((w) => (w.id === tempId ? { ...w, id: res.id } : w))
        );
      }
    } catch (err) {
      setError('Gagal menambah kantong di server: ' + err.message);
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateWallet = async (payload) => {
    // Update instan di UI
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === payload.id) {
          const diffInitial =
            (Number(payload.initial_balance) || 0) - (Number(w.initial_balance) || 0);
          return {
            ...w,
            name: payload.name ?? w.name,
            type: payload.type ?? w.type,
            initial_balance:
              payload.initial_balance !== undefined
                ? Number(payload.initial_balance)
                : w.initial_balance,
            current_balance: (Number(w.current_balance) || 0) + diffInitial,
            color: payload.color ?? w.color,
          };
        }
        return w;
      })
    );
    showToast('Kantong Diperbarui', `Informasi kantong "${payload.name || ''}" berhasil diperbarui.`, 'success');

    // Kirim di background
    setIsSyncing(true);
    try {
      await updateWallet(payload);
    } catch (err) {
      setError('Gagal memperbarui kantong di server: ' + err.message);
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteWallet = async (id) => {
    // Hapus instan di UI
    setWallets((prev) => prev.filter((w) => w.id !== id));
    showToast('Kantong Dihapus', 'Kantong saldo berhasil dihapus dari daftar.', 'info');

    // Kirim di background
    setIsSyncing(true);
    try {
      await deleteWallet(id);
    } catch (err) {
      setError('Gagal menghapus kantong di server: ' + err.message);
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  // CRUD KATEGORI (OPTIMISTIC & INSTANT)
  const handleAddCategory = async (payload) => {
    const tempId = 'c-' + Date.now();
    const newCategory = {
      id: tempId,
      name: payload.name,
      type: payload.type || 'EXPENSE',
      icon: payload.type === 'INCOME' ? 'Briefcase' : 'ShoppingBag',
    };

    // Tambah instan ke UI
    setCategories((prev) => [...prev, newCategory]);
    showToast('Kategori Ditambahkan', `Kategori "${payload.name}" berhasil dibuat.`, 'success');

    // Kirim di background
    setIsSyncing(true);
    try {
      const res = await addCategory(payload);
      if (res?.id) {
        setCategories((prev) =>
          prev.map((c) => (c.id === tempId ? { ...c, id: res.id } : c))
        );
      }
    } catch (err) {
      setError('Gagal menambah kategori di server: ' + err.message);
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateCategory = async (payload) => {
    // Update instan di UI
    setCategories((prev) =>
      prev.map((c) => (c.id === payload.id ? { ...c, ...payload } : c))
    );
    showToast('Kategori Diperbarui', `Kategori "${payload.name || ''}" berhasil diperbarui.`, 'success');

    // Kirim di background
    setIsSyncing(true);
    try {
      await updateCategory(payload);
    } catch (err) {
      setError('Gagal memperbarui kategori di server: ' + err.message);
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    // Hapus instan di UI
    setCategories((prev) => prev.filter((c) => c.id !== id));
    showToast('Kategori Dihapus', 'Kategori transaksi berhasil dihapus.', 'info');

    // Kirim di background
    setIsSyncing(true);
    try {
      await deleteCategory(id);
    } catch (err) {
      setError('Gagal menghapus kategori di server: ' + err.message);
      loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddDebt = async (debtData) => {
    const tempId = 'd-' + Date.now();
    const newDebt = {
      ...debtData,
      id: tempId,
      created_at: new Date().toISOString(),
      is_active: true,
    };
    const updated = [newDebt, ...debts];
    setDebts(updated);
    saveDebtsToStorage(updated);
    showToast(
      debtData.type === 'DEBT_RECEIVABLE' ? 'Piutang Dicatat' : 'Tagihan Dicatat',
      `"${debtData.title}" berhasil ditambahkan ke daftar.`,
      'success'
    );

    setIsSyncing(true);
    try {
      const res = await addDebt(debtData);
      if (res.id && res.id !== tempId) {
        const finalDebts = updated.map((d) => (d.id === tempId ? { ...d, id: res.id } : d));
        setDebts(finalDebts);
        saveDebtsToStorage(finalDebts);
      }
    } catch (err) {
      setError('Penyimpanan lokal berhasil, namun gagal sinkron ke cloud: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateDebt = async (debtData) => {
    const updated = debts.map((d) => (d.id === debtData.id ? { ...d, ...debtData } : d));
    setDebts(updated);
    saveDebtsToStorage(updated);
    showToast('Data Diperbarui', `Perubahan data "${debtData.title}" berhasil disimpan.`, 'success');

    setIsSyncing(true);
    try {
      await updateDebt(debtData);
    } catch (err) {
      setError('Penyimpanan lokal berhasil, namun gagal sinkron ke cloud: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteDebt = async (id) => {
    const updated = debts.filter((d) => d.id !== id);
    setDebts(updated);
    saveDebtsToStorage(updated);
    showToast('Data Dihapus', 'Data tagihan/cicilan/piutang berhasil dihapus.', 'info');

    setIsSyncing(true);
    try {
      await deleteDebt(id);
    } catch (err) {
      setError('Penghapusan lokal berhasil, namun gagal sinkron ke cloud: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePayDebt = async (paymentData) => {
    setIsSyncing(true);
    try {
      const res = await payDebt(paymentData);

      // Buat transaksi baru di riwayat lokal
      const isReceivable = paymentData.type === 'DEBT_RECEIVABLE';
      const newTrx = {
        id: res.trx_id || 'trx-' + Date.now(),
        date: paymentData.date,
        type: isReceivable ? 'INCOME' : 'EXPENSE',
        amount: Number(paymentData.amount),
        category_id: paymentData.category_id || '',
        from_wallet_id: isReceivable ? '' : paymentData.wallet_id,
        to_wallet_id: isReceivable ? paymentData.wallet_id : '',
        actor: paymentData.actor || 'Suami',
        notes: paymentData.notes || `Bayar ${paymentData.title}`,
        receipt_url: res.receipt_url || '',
        receipt_file_id: res.receipt_file_id || '',
        created_at: new Date().toISOString(),
      };

      const updatedTrxs = [newTrx, ...transactions];
      setTransactions(updatedTrxs);
      setWallets((prev) => recalculateWallets(prev, updatedTrxs));

      // Update status / remaining amount pada debts
      const currentPeriod = paymentData.date.substring(0, 7);
      const updatedDebts = debts.map((d) => {
        if (d.id === paymentData.debt_id) {
          if (d.type === 'BILL') {
            return {
              ...d,
              last_paid_at: paymentData.date,
              last_paid_period: currentPeriod,
            };
          } else {
            const newRem =
              res.remaining_amount !== undefined
                ? res.remaining_amount
                : Math.max(0, (Number(d.remaining_amount) || 0) - Number(paymentData.amount));
            return {
              ...d,
              remaining_amount: newRem,
              last_paid_at: paymentData.date,
              last_paid_period: currentPeriod,
            };
          }
        }
        return d;
      });

      setDebts(updatedDebts);
      saveDebtsToStorage(updatedDebts);
      showToast('Pembayaran Berhasil', `Pembayaran "${paymentData.title}" sebesar ${formatRupiah(paymentData.amount)} berhasil dicatat.`, 'success');
    } catch (err) {
      setError('Gagal memproses pembayaran tagihan: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24 md:pb-10 md:pl-64">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenQuickInput={() => setIsQuickInputOpen(true)}
      />

      {/* TOP HEADER BAR */}
      <header className="sticky top-0 z-20 bg-[#F8FAFC]/90 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
            Halo, Keluarga! 👋
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            Kelola arus kas & multi-kantong saldo bersama dengan transparan
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Status Sinkronisasi Realtime */}
          {isSyncing ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-200 shadow-sm animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Menyimpan ke Cloud...</span>
              <span className="sm:hidden">Menyimpan...</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Tersinkron</span>
            </div>
          )}

          {/* Tombol Refresh Sinkronisasi */}
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Sinkronkan ulang dari Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Segmented Pill Toggle Identitas: Suami / Istri */}
          <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
            {['Suami', 'Istri'].map((role) => (
              <button
                key={role}
                onClick={() => handleToggleActor(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeActor === role
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {role === 'Suami' ? '👨 Suami' : '👩 Istri'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <strong>Koneksi ke GAS Bermasalah:</strong> {error}
          </div>
        )}

        {isLoading && wallets.length === 0 ? (
          <div className="py-24 text-center text-sm text-slate-500 font-medium">
            Memuat data keuangan dari Google Sheets...
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                wallets={wallets}
                categories={categories}
                transactions={transactions}
                debts={debts}
                activeActor={activeActor}
                onOpenQuickInput={() => setIsQuickInputOpen(true)}
                onSelectReceipt={(trx) => setSelectedReceiptTrx(trx)}
                onGoToWallets={() => setActiveTab('wallets')}
                onGoToHistory={() => setActiveTab('history')}
                onGoToDebts={() => setActiveTab('debts')}
                onGoToReports={() => setActiveTab('reports')}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                transactions={transactions}
                wallets={wallets}
                categories={categories}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={(trx) => setEditingTransaction(trx)}
                onSelectReceipt={(trx) => setSelectedReceiptTrx(trx)}
              />
            )}

            {activeTab === 'debts' && (
              <DebtsView
                debts={debts}
                wallets={wallets}
                categories={categories}
                defaultActor={activeActor}
                onAddDebt={handleAddDebt}
                onUpdateDebt={handleUpdateDebt}
                onDeleteDebt={handleDeleteDebt}
                onPayDebt={handlePayDebt}
                onBackToDashboard={() => setActiveTab('dashboard')}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                transactions={transactions}
                wallets={wallets}
                categories={categories}
                debts={debts}
                onSelectReceipt={(trx) => setSelectedReceiptTrx(trx)}
              />
            )}

            {activeTab === 'wallets' && (
              <WalletsView
                wallets={wallets}
                transactions={transactions}
                onAddWallet={handleAddWallet}
                onUpdateWallet={handleUpdateWallet}
                onDeleteWallet={handleDeleteWallet}
              />
            )}

            {activeTab === 'categories' && (
              <CategoriesView
                categories={categories}
                transactions={transactions}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            )}
          </>
        )}
      </main>

      {/* MODAL QUICK INPUT TRANSAKSI (CREATE & EDIT) */}
      {(isQuickInputOpen || !!editingTransaction) && (
        <QuickInputModal
          isOpen={isQuickInputOpen || !!editingTransaction}
          onClose={() => {
            setIsQuickInputOpen(false);
            setEditingTransaction(null);
          }}
          wallets={wallets}
          categories={categories}
          defaultActor={activeActor}
          editData={editingTransaction}
          onSaveTransaction={handleSaveTransaction}
        />
      )}

      {/* MODAL LIGHTBOX PRATINJAU STRUK GOOGLE DRIVE */}
      {selectedReceiptTrx && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedReceiptTrx(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 transition-all"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Bukti Struk Transaksi</h4>
                <p className="text-xs text-slate-500">
                  {formatDateIndo(selectedReceiptTrx.date)} • {formatRupiah(selectedReceiptTrx.amount)}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceiptTrx(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-100 rounded-2xl overflow-hidden max-h-[60vh] flex items-center justify-center">
              <img
                src={selectedReceiptTrx.receipt_url}
                alt="Bukti Transaksi"
                className="w-full h-auto object-contain"
              />
            </div>

            {selectedReceiptTrx.receipt_file_id && (
              <a
                href={`https://drive.google.com/file/d/${selectedReceiptTrx.receipt_file_id}/view`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka File Asli di Google Drive</span>
              </a>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* TOAST NOTIFIKASI INTERAKTIF & INFORMATIF */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}