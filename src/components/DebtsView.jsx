import { useState, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Camera,
  UploadCloud,
  ChevronLeft,
  CreditCard,
  UserCheck,
  History,
  Receipt,
} from 'lucide-react';
import {
  formatRupiah,
  formatDateIndo,
  getTodayISO,
  getCurrentPeriod,
  getPeriodString,
} from '../utils/formatters';
import { compressImageToBase64 } from '../services/api';
import ConfirmModal from './ConfirmModal';

export default function DebtsView({
  debts = [],
  wallets = [],
  categories = [],
  transactions = [],
  defaultActor = 'Suami',
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onPayDebt,
  onSelectReceipt,
  onBackToDashboard,
}) {
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | BILL | DEBT_PAYABLE | DEBT_RECEIVABLE
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [debtToDelete, setDebtToDelete] = useState(null);

  // Form State untuk Tambah / Edit
  const [formData, setFormData] = useState({
    title: '',
    type: 'BILL', // BILL | DEBT_PAYABLE | DEBT_RECEIVABLE
    category_id: '',
    total_amount: '',
    installment_amount: '',
    remaining_amount: '',
    due_day: '15',
    actor: defaultActor || 'Bersama',
    notes: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);

  // State Modal Pembayaran (Pay Modal)
  const [payingDebt, setPayingDebt] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payWalletId, setPayWalletId] = useState('');
  const [payDate, setPayDate] = useState(getTodayISO());
  const [payActor, setPayActor] = useState(defaultActor || 'Suami');
  const [payNotes, setPayNotes] = useState('');
  const [payReceipt, setPayReceipt] = useState(null);
  const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);

  const receiptInputId = useId();

  // Helper identifikasi periode bulan ini (format standar: YYYY-MM)
  const currentPeriod = getCurrentPeriod();
  const todayDay = new Date().getDate();

  // Sanitasi & Normalisasi data tagihan & cicilan (Self-healing jika installment_amount tertukar/salah)
  const normalizedDebts = debts.map((d) => {
    const cleanPeriod = getPeriodString(d.last_paid_period);
    if (d.type === 'BILL') {
      const billAmt =
        Number(d.total_amount) > 100
          ? Number(d.total_amount)
          : Number(d.installment_amount) || Number(d.total_amount) || 0;
      return {
        ...d,
        last_paid_period: cleanPeriod,
        total_amount: billAmt,
        installment_amount: billAmt,
        remaining_amount: billAmt,
      };
    }
    return {
      ...d,
      last_paid_period: cleanPeriod,
    };
  });

  // Kalkulasi statistik ringkasan
  const pendingBills = normalizedDebts.filter(
    (d) => d.type === 'BILL' && getPeriodString(d.last_paid_period) !== currentPeriod
  );
  const totalPendingBillsAmount = pendingBills.reduce(
    (acc, d) => acc + (Number(d.total_amount || d.installment_amount) || 0),
    0
  );

  const payableDebts = normalizedDebts.filter((d) => d.type === 'DEBT_PAYABLE');
  const totalPayableRemaining = payableDebts.reduce((acc, d) => acc + (Number(d.remaining_amount) || 0), 0);

  const receivableDebts = normalizedDebts.filter((d) => d.type === 'DEBT_RECEIVABLE');
  const totalReceivableRemaining = receivableDebts.reduce((acc, d) => acc + (Number(d.remaining_amount) || 0), 0);

  // Filter daftar transaksi pembayaran tagihan / hutang untuk riwayat
  const debtPaymentTrxs = transactions.filter((t) => {
    if (!t.notes && !t.category_id) return false;
    const noteLower = (t.notes || '').toLowerCase();
    const isPayPrefix = noteLower.startsWith('bayar ');
    const matchesDebtTitle = normalizedDebts.some((d) =>
      noteLower.includes(d.title.toLowerCase())
    );
    return isPayPrefix || matchesDebtTitle;
  });

  // Filter daftar data sesuai tab aktif
  const filteredDebts = normalizedDebts.filter((d) => {
    if (activeFilter === 'BILL') return d.type === 'BILL';
    if (activeFilter === 'DEBT_PAYABLE') return d.type === 'DEBT_PAYABLE';
    if (activeFilter === 'DEBT_RECEIVABLE') return d.type === 'DEBT_RECEIVABLE';
    return true;
  });

  // Handler Buka Modal Tambah
  const handleOpenAdd = () => {
    setEditingDebt(null);
    setFormData({
      title: '',
      type: 'BILL',
      category_id: categories.find((c) => c.type === 'EXPENSE')?.id || '',
      total_amount: '',
      installment_amount: '',
      remaining_amount: '',
      due_day: '15',
      actor: defaultActor || 'Bersama',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  // Handler Buka Modal Edit
  const handleOpenEdit = (debt) => {
    setEditingDebt(debt);
    const isBill = debt.type === 'BILL';
    const effectiveAmt = isBill
      ? String(debt.total_amount || debt.installment_amount || '')
      : (debt.total_amount ? String(debt.total_amount) : '');
    setFormData({
      title: debt.title || '',
      type: debt.type || 'BILL',
      category_id: debt.category_id || '',
      total_amount: effectiveAmt,
      installment_amount: isBill ? effectiveAmt : (debt.installment_amount ? String(debt.installment_amount) : ''),
      remaining_amount: debt.remaining_amount !== undefined ? String(debt.remaining_amount) : '',
      due_day: debt.due_day ? String(debt.due_day) : '15',
      actor: debt.actor || 'Bersama',
      notes: debt.notes || '',
    });
    setIsAddModalOpen(true);
  };

  // Simpan Tambah / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const totalAmt = Number(formData.total_amount) || 0;
    const isBill = formData.type === 'BILL';
    const instAmt = isBill ? totalAmt : (Number(formData.installment_amount) || totalAmt);
    const remAmt = isBill ? totalAmt : (formData.remaining_amount !== '' ? Number(formData.remaining_amount) : totalAmt);

    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      category_id: formData.category_id || '',
      total_amount: totalAmt,
      installment_amount: instAmt,
      remaining_amount: remAmt,
      due_day: Number(formData.due_day) || 1,
      actor: formData.actor,
      notes: formData.notes.trim(),
    };

    setFormSubmitting(true);
    try {
      if (editingDebt) {
        await onUpdateDebt({ ...payload, id: editingDebt.id });
      } else {
        await onAddDebt(payload);
      }
      setIsAddModalOpen(false);
      setEditingDebt(null);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handler Hapus
  const handleDelete = (debt) => {
    setDebtToDelete(debt);
  };

  // Handler Buka Modal Bayar
  const handleOpenPay = (debt) => {
    setPayingDebt(debt);
    setPayNotes(`Bayar ${debt.title} (${formatDateIndo(getTodayISO())})`);
    setPayDate(getTodayISO());
    setPayActor(defaultActor || 'Suami');
    setPayReceipt(null);

    let defaultAmt = 0;
    if (debt.type === 'BILL') {
      defaultAmt = Number(debt.total_amount || debt.installment_amount || 0);
    } else {
      defaultAmt = Math.min(
        Number(debt.installment_amount) || Number(debt.remaining_amount) || 0,
        Number(debt.remaining_amount) || 0
      ) || Number(debt.installment_amount) || Number(debt.total_amount) || 0;
    }
    setPayAmount(String(defaultAmt || ''));

    // Otomatis pilih kantong pertama yang memiliki saldo mencukupi (jika jenisnya pengeluaran)
    if (debt.type !== 'DEBT_RECEIVABLE') {
      const viableWallet = wallets.find((w) => Number(w.current_balance || 0) >= defaultAmt);
      setPayWalletId(viableWallet ? viableWallet.id : (wallets[0]?.id || ''));
    } else {
      setPayWalletId(wallets[0]?.id || '');
    }
  };

  // Upload Struk Bayar
  const handleReceiptChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingReceipt(true);
    try {
      const compressed = await compressImageToBase64(file);
      setPayReceipt(compressed);
    } catch {
      alert('Gagal memproses gambar. Gunakan format JPG/PNG.');
    } finally {
      setIsCompressingReceipt(false);
    }
  };

  // Submit Pembayaran
  const handleSubmitPay = async (e) => {
    e.preventDefault();
    if (!payingDebt) return;
    const amountNum = Number(payAmount) || 0;
    if (amountNum <= 0) {
      alert('Masukkan nominal pembayaran yang valid');
      return;
    }
    if (!payWalletId) {
      alert('Pilih kantong saldo pembayaran');
      return;
    }

    const isExpensePayment = payingDebt.type !== 'DEBT_RECEIVABLE';
    const chosenWallet = wallets.find((w) => w.id === payWalletId);
    if (isExpensePayment && (!chosenWallet || Number(chosenWallet.current_balance || 0) < amountNum)) {
      alert(`Saldo kantong ${chosenWallet?.name || 'yang dipilih'} (${formatRupiah(chosenWallet?.current_balance || 0)}) tidak mencukupi untuk pembayaran sebesar ${formatRupiah(amountNum)}.`);
      return;
    }

    setPaySubmitting(true);
    try {
      await onPayDebt({
        debt_id: payingDebt.id,
        title: payingDebt.title,
        type: payingDebt.type,
        amount: amountNum,
        wallet_id: payWalletId,
        category_id: payingDebt.category_id || '',
        date: payDate,
        actor: payActor,
        notes: payNotes,
        receipt_base64: payReceipt ? payReceipt.base64 : '',
        receipt_name: payReceipt ? payReceipt.name : '',
        receipt_mime: payReceipt ? payReceipt.mime : '',
      });
      setPayingDebt(null);
    } finally {
      setPaySubmitting(false);
    }
  };

  // Validasi saldo kantong untuk modal pembayaran
  const currentPayAmountNum = Number(payAmount) || 0;
  const isPayExpense = payingDebt?.type !== 'DEBT_RECEIVABLE';
  const currentChosenWallet = wallets.find((w) => w.id === payWalletId);
  const isChosenWalletInsufficient = Boolean(
    isPayExpense && currentChosenWallet && Number(currentChosenWallet.current_balance || 0) < currentPayAmountNum
  );
  const hasSufficientWalletAvailable = isPayExpense
    ? wallets.some((w) => Number(w.current_balance || 0) >= currentPayAmountNum)
    : true;

  return (
    <div className="space-y-6">
      {/* HEADER UTAMA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Kembali ke Beranda"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg">Tagihan &amp; Hutang</h2>
            <p className="text-xs text-slate-500">
              Kelola tagihan rutin bulanan, cicilan pinjaman, dan piutang keluarga
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="self-start sm:self-auto py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Baru</span>
        </button>
      </div>

      {/* STATISTIK RINGKASAN BENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Tagihan Rutin Belum Bayar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Tagihan Bulan Ini
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {pendingBills.length} Belum Bayar
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{formatRupiah(totalPendingBillsAmount)}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {pendingBills.length > 0 ? 'Perlu diselesaikan bulan ini' : 'Semua tagihan bulan ini telah lunas!'}
            </p>
          </div>
        </div>

        {/* Card 2: Total Sisa Hutang & Cicilan */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
              Sisa Hutang &amp; Cicilan
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              {payableDebts.length} Pos
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{formatRupiah(totalPayableRemaining)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Total pokok kewajiban keluarga yang tersisa</p>
          </div>
        </div>

        {/* Card 3: Total Piutang Berjalan */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
              Piutang Berjalan
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {receivableDebts.length} Pos
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{formatRupiah(totalReceivableRemaining)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Dana keluarga yang dipinjamkan ke pihak luar</p>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'ALL', label: `Semua (${debts.length})` },
          { id: 'BILL', label: `Tagihan Rutin (${debts.filter((d) => d.type === 'BILL').length})` },
          { id: 'DEBT_PAYABLE', label: `Hutang & Cicilan (${payableDebts.length})` },
          { id: 'DEBT_RECEIVABLE', label: `Piutang (${receivableDebts.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeFilter === tab.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DAFTAR ITEM TAGIHAN / HUTANG */}
      {filteredDebts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Belum Ada Data Tagihan atau Hutang</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Catat tagihan rutin (Wifi, Listrik, BPJS) atau cicilan (KPR, Motor) untuk memantau jatuh tempo dan pelunasan secara rapi.
          </p>
          <button
            onClick={handleOpenAdd}
            className="py-2.5 px-4 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-100 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Catatan Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDebts.map((item) => {
            const isBill = item.type === 'BILL';
            const isPayable = item.type === 'DEBT_PAYABLE';
            const isReceivable = item.type === 'DEBT_RECEIVABLE';

            const itemPeriod = getPeriodString(item.last_paid_period);
            const isBillPaidThisMonth = isBill && itemPeriod === currentPeriod;
            const isDuePassed = !isBillPaidThisMonth && item.due_day && todayDay > Number(item.due_day);

            // Persentase pelunasan untuk cicilan/hutang
            const total = Number(item.total_amount) || 1;
            const remaining = Number(item.remaining_amount) || 0;
            const paid = Math.max(0, total - remaining);
            const progressPercent = Math.min(100, Math.round((paid / total) * 100));
            const isDebtCompleted = remaining <= 0;

            const category = categories.find((c) => c.id === item.category_id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  {/* Top Badges & Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                          isBill
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : isPayable
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isBill ? 'Tagihan Rutin' : isPayable ? 'Hutang / Cicilan' : 'Piutang'}
                      </span>

                      {/* Status Tagihan */}
                      {isBill && (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isBillPaidThisMonth
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isDuePassed
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isBillPaidThisMonth ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Lunas Bulan Ini
                            </>
                          ) : isDuePassed ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-rose-500" /> Lewat Tempo (Tgl {item.due_day})
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-amber-500" /> Tempo Tgl {item.due_day}
                            </>
                          )}
                        </span>
                      )}

                      {/* Status Hutang / Cicilan */}
                      {!isBill && isDebtCompleted && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Sudah Lunas
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                        title="Edit Catatan"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus Catatan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Judul & Detail */}
                  <h4 className="font-bold text-slate-900 text-base leading-snug">{item.title}</h4>
                  {item.notes && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.notes}</p>}

                  {/* Info Tagihan Rutin */}
                  {isBill && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-medium text-slate-500 block">Nominal Tagihan per Bulan</span>
                        <span className="text-base font-bold text-slate-900">
                          {formatRupiah(item.total_amount || item.installment_amount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-medium text-slate-500 block">Jatuh Tempo</span>
                        <span className="text-xs font-semibold text-slate-700">Tgl {item.due_day} tiap bulan</span>
                      </div>
                    </div>
                  )}

                  {/* Info Hutang & Cicilan (Progress Bar) */}
                  {!isBill && (
                    <div className="mt-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Sisa Pokok</span>
                          <span className="font-bold text-slate-900 text-sm">{formatRupiah(remaining)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Total Pokok</span>
                          <span className="font-semibold text-slate-600 text-xs">{formatRupiah(total)}</span>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isReceivable ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{progressPercent}% Terbayar</span>
                        <span>Cicilan: {formatRupiah(item.installment_amount || 0)} / bln</span>
                      </div>
                    </div>
                  )}

                  {/* Metadata Tambahan */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      {item.actor || 'Bersama'}
                    </span>
                    {category && (
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        {category.name}
                      </span>
                    )}
                    {item.last_paid_at && (
                      <span className="text-slate-400">
                        Terakhir bayar: {formatDateIndo(item.last_paid_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tombol Aksi Pembayaran */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {isBill ? (
                    <button
                      onClick={() => handleOpenPay(item)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                        isBillPaidThisMonth
                          ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isBillPaidThisMonth ? 'Bayar Tagihan Lagi' : 'Bayar Tagihan Sekarang'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPay(item)}
                      disabled={isDebtCompleted}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                        isDebtCompleted
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : isReceivable
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isDebtCompleted
                          ? 'Kewajiban Telah Lunas'
                          : isReceivable
                          ? 'Catat Pengembalian Dana'
                          : 'Bayar Cicilan / Pelunasan'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION RIWAYAT PEMBAYARAN TAGIHAN & CICILAN */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Riwayat Pembayaran Tagihan &amp; Cicilan</h3>
              <p className="text-[11px] text-slate-500">
                Catatan seluruh transaksi pembayaran tagihan rutin, pelunasan pinjaman, dan struk bukti bayar
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            {debtPaymentTrxs.length} Catatan
          </span>
        </div>

        {debtPaymentTrxs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">Belum Ada Riwayat Pembayaran</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ketika Anda menekan &quot;Bayar Tagihan Sekarang&quot;, riwayat dan struknya otomatis terdata rapi di sini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {debtPaymentTrxs.slice(0, 15).map((trx) => {
              const wallet = wallets.find((w) => w.id === (trx.from_wallet_id || trx.to_wallet_id));
              const isIncome = trx.type === 'INCOME';

              return (
                <div
                  key={trx.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {trx.notes || 'Pembayaran Tagihan'}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{formatDateIndo(trx.date)}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-600">{wallet?.name || 'Kantong Saldo'}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {trx.actor}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-xs sm:text-sm font-bold block ${
                          isIncome ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatRupiah(trx.amount)}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Berhasil
                      </span>
                    </div>

                    {trx.receipt_url && onSelectReceipt && (
                      <button
                        onClick={() => onSelectReceipt(trx)}
                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                        title="Lihat Struk Bukti Bayar"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: TAMBAH / EDIT TAGIHAN ATAU HUTANG */}
      {isAddModalOpen && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {editingDebt ? 'Edit Tagihan / Hutang' : 'Tambah Tagihan / Hutang Baru'}
                </h3>
                <p className="text-xs text-slate-500">Isi data secara lengkap untuk pelacakan yang akurat</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Jenis Catatan dengan Deskripsi Jelas */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Jenis Catatan</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'BILL', label: 'Tagihan Rutin', desc: 'Wifi, Listrik, PDAM' },
                    { id: 'DEBT_PAYABLE', label: 'Hutang / Cicilan', desc: 'KPR, Motor, Pinjaman' },
                    { id: 'DEBT_RECEIVABLE', label: 'Piutang', desc: 'Uang dipinjam orang' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          type: t.id,
                          installment_amount: t.id === 'BILL' ? formData.total_amount : formData.installment_amount,
                        })
                      }
                      className={`py-2 px-2 rounded-xl text-center transition flex flex-col items-center justify-center ${
                        formData.type === t.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold">{t.label}</span>
                      <span
                        className={`text-[9px] mt-0.5 ${
                          formData.type === t.id ? 'text-indigo-100' : 'text-slate-400'
                        }`}
                      >
                        {t.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Judul */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama {formData.type === 'BILL' ? 'Tagihan' : formData.type === 'DEBT_PAYABLE' ? 'Hutang / Cicilan' : 'Piutang'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.type === 'BILL'
                      ? 'Contoh: Wifi IndiHome, Listrik PLN, BPJS'
                      : formData.type === 'DEBT_PAYABLE'
                      ? 'Contoh: Cicilan Motor Honda, KPR Bank Mandiri'
                      : 'Contoh: Pinjaman Teman (Budi)'
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* KONDISIONAL INPUT NOMINAL SESUAI JENIS */}
              {formData.type === 'BILL' ? (
                /* 1. KHUSUS TAGIHAN RUTIN: HANYA 1 INPUT NOMINAL JELAS (TIDAK ADA INPUT GANDA) */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Nominal Tagihan per Bulan (Rp) <span className="text-rose-500">*</span>
                    </label>
                    {formData.total_amount && Number(formData.total_amount) > 0 && (
                      <span className="text-xs font-bold text-indigo-600">
                        {formatRupiah(formData.total_amount)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 170000"
                    value={formData.total_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_amount: e.target.value,
                        installment_amount: e.target.value,
                        remaining_amount: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Besaran rupiah tagihan yang harus dibayarkan setiap bulannya saat jatuh tempo.
                  </p>
                </div>
              ) : (
                /* 2. KHUSUS HUTANG / CICILAN & PIUTANG: TOTAL POKOK + NOMINAL CICILAN */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          {formData.type === 'DEBT_PAYABLE' ? 'Total Pokok Hutang' : 'Total Pinjaman'}{' '}
                          <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Contoh: 15000000"
                        value={formData.total_amount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({
                            ...formData,
                            total_amount: val,
                            remaining_amount: formData.remaining_amount !== '' ? formData.remaining_amount : val,
                          });
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                      />
                      {formData.total_amount && Number(formData.total_amount) > 0 && (
                        <p className="text-[11px] text-indigo-600 font-bold mt-1">
                          {formatRupiah(formData.total_amount)}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700">
                          Nominal Cicilan / Bulan (Rp) <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Contoh: 1500000"
                        value={formData.installment_amount}
                        onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500"
                      />
                      {formData.installment_amount && Number(formData.installment_amount) > 0 && (
                        <p className="text-[11px] text-indigo-600 font-bold mt-1">
                          {formatRupiah(formData.installment_amount)} / bln
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sisa Pokok (khusus hutang berjalan) */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Sisa Pokok yang Belum Lunas (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Biarkan kosong jika sama dengan Total Pokok"
                      value={formData.remaining_amount}
                      onChange={(e) => setFormData({ ...formData, remaining_amount: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                    {formData.remaining_amount && Number(formData.remaining_amount) > 0 && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Sisa saat ini: <strong className="text-slate-800">{formatRupiah(formData.remaining_amount)}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tanggal Jatuh Tempo Bulanan & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Jatuh Tempo (Tgl 1 - 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Contoh: 15"
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori Transaksi</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Tanpa Kategori Khusus --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pelaku / Penanggung Jawab */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Penanggung Jawab</label>
                <div className="flex gap-2">
                  {['Bersama', 'Suami', 'Istri'].map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => setFormData({ ...formData, actor: role })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                        formData.actor === role
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Tambahan</label>
                <textarea
                  rows="2"
                  placeholder="Contoh: No Pelanggan 12345678, Tenor 12 bulan s.d. Des 2027"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-100 transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Menyimpan...' : editingDebt ? 'Perbarui Data' : 'Simpan Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: BAYAR TAGIHAN / CICILAN */}
      {payingDebt && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setPayingDebt(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {payingDebt.type === 'DEBT_RECEIVABLE' ? 'Catat Pengembalian Piutang' : 'Bayar Tagihan / Cicilan'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold text-indigo-600 mt-0.5">
                  {payingDebt.title}
                </p>
              </div>
              <button
                onClick={() => setPayingDebt(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPay} className="space-y-4">
              {/* Nominal Pembayaran */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nominal yang Dibayarkan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Pilih Kantong Saldo */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {payingDebt.type === 'DEBT_RECEIVABLE' ? 'Masuk ke Kantong Mana?' : 'Dipungut dari Kantong Mana?'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={payWalletId}
                  onChange={(e) => setPayWalletId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none transition ${
                    isChosenWalletInsufficient
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-indigo-500'
                  }`}
                >
                  {wallets.map((w) => {
                    const isInsufficient = isPayExpense && Number(w.current_balance || 0) < currentPayAmountNum;
                    return (
                      <option
                        key={w.id}
                        value={w.id}
                        disabled={isInsufficient}
                        className={isInsufficient ? 'text-slate-400 bg-slate-100' : 'text-slate-900'}
                      >
                        {w.name} ({w.type}) — Saldo: {formatRupiah(w.current_balance)}
                        {isInsufficient ? ' ⚠️ [Saldo Kurang]' : ''}
                      </option>
                    );
                  })}
                </select>

                {/* Peringatan jika saldo kantong yang dipilih tidak mencukupi */}
                {isChosenWalletInsufficient && (
                  <div className="mt-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Saldo Kantong Tidak Mencukupi</span>
                      <p className="text-[11px] text-rose-600 mt-0.5 leading-relaxed">
                        Saldo di <strong>{currentChosenWallet?.name}</strong> ({formatRupiah(currentChosenWallet?.current_balance || 0)}) tidak mencukupi untuk pembayaran sebesar <strong>{formatRupiah(currentPayAmountNum)}</strong>.
                        {!hasSufficientWalletAvailable && ' Tidak ada kantong lain dengan saldo yang mencukupi. Silakan lakukan top up atau transfer saldo dahulu.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tanggal & Pelaku */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tanggal Pembayaran</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Pelaku Pembayar</label>
                  <div className="flex gap-2">
                    {['Suami', 'Istri'].map((role) => (
                      <button
                        type="button"
                        key={role}
                        onClick={() => setPayActor(role)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                          payActor === role
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Catatan Transaksi */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan Riwayat</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Upload Struk Bukti Transfer / Pembayaran */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Upload Bukti Transfer / Struk (Opsional)
                </label>
                <input
                  type="file"
                  id={receiptInputId}
                  accept="image/*"
                  onChange={handleReceiptChange}
                  className="hidden"
                />

                {payReceipt ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <img
                        src={payReceipt.base64}
                        alt="Struk"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-800 block truncate max-w-[200px]">
                          {payReceipt.name}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          Foto terkompresi &amp; siap diunggah
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayReceipt(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor={receiptInputId}
                    className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 transition text-center"
                  >
                    <div className="p-2 rounded-full bg-white text-indigo-600 shadow-sm">
                      {isCompressingReceipt ? (
                        <UploadCloud className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {isCompressingReceipt ? 'Sedang Mengompresi Foto...' : 'Foto Struk atau Screenshot M-Banking'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Otomatis dikompresi &amp; diarsipkan ke Google Drive
                    </span>
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    paySubmitting ||
                    isCompressingReceipt ||
                    isChosenWalletInsufficient ||
                    currentPayAmountNum <= 0
                  }
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{paySubmitting ? 'Memproses...' : 'Konfirmasi Pembayaran'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        isOpen={Boolean(debtToDelete)}
        title={debtToDelete?.type === 'DEBT_RECEIVABLE' ? 'Hapus Data Piutang?' : 'Hapus Tagihan / Cicilan?'}
        message={debtToDelete ? `Apakah Anda yakin ingin menghapus data "${debtToDelete.title}"? Seluruh riwayat pembayaran terkait juga akan dibersihkan.` : ''}
        confirmText="Ya, Hapus Data"
        cancelText="Batal"
        confirmType="danger"
        onCancel={() => setDebtToDelete(null)}
        onConfirm={async () => {
          if (!debtToDelete) return;
          const target = debtToDelete;
          setDebtToDelete(null);
          await onDeleteDebt(target.id);
        }}
      />
    </div>
  );
}
