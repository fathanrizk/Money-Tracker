import { useState } from 'react';
import {
  Eye,
  EyeOff,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Paperclip,
  Plus,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';

export default function Dashboard({
  wallets,
  categories,
  transactions,
  debts = [],
  onOpenQuickInput,
  onSelectReceipt,
  onGoToWallets,
  onGoToHistory,
  onGoToDebts,
  onGoToReports,
}) {
  const [showBalance, setShowBalance] = useState(true);
  const [monthlyBudget] = useState(10000000); // Target batas anggaran bulanan default Rp 10 Juta

  // Hitung Total Kekayaan Bersih (Semua Kantong)
  const totalNetWorth = wallets.reduce((acc, w) => acc + (Number(w.current_balance) || 0), 0);

  // Filter Transaksi Bulan Ini
  const now = new Date();
  const currentMonthTrx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const monthlyIncome = currentMonthTrx
    .filter((t) => t.type === 'INCOME')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const monthlyExpense = currentMonthTrx
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const budgetPercentage = Math.min(Math.round((monthlyExpense / monthlyBudget) * 100), 100);

  // Hitung Breakdown Pengeluaran per Kategori Bulan Ini
  const expenseByCategory = {};
  currentMonthTrx
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      const cat = categories.find((c) => c.id === t.category_id);
      const catName = cat ? cat.name : 'Lainnya';
      expenseByCategory[catName] = (expenseByCategory[catName] || 0) + Number(t.amount);
    });

  const categoryBreakdown = Object.entries(expenseByCategory)
    .map(([name, amount]) => ({
      name,
      amount,
      percent: monthlyExpense > 0 ? Math.round((amount / monthlyExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const getWalletName = (id) => wallets.find((w) => w.id === id)?.name || '-';
  const getCategoryName = (id) => categories.find((c) => c.id === id)?.name || 'Mutasi Saldo';

  // Kalkulasi Tagihan & Cicilan Bulan Ini
  const currentPeriod = now.toISOString().substring(0, 7);
  const todayDay = now.getDate();
  const pendingBills = debts.filter((d) => d.type === 'BILL' && d.last_paid_period !== currentPeriod);
  const totalPendingBillsAmount = pendingBills.reduce(
    (acc, d) => {
      const amt = Number(d.total_amount) > 100
        ? Number(d.total_amount)
        : (Number(d.total_amount || d.installment_amount) || 0);
      return acc + amt;
    },
    0
  );
  const payableDebts = debts.filter((d) => d.type === 'DEBT_PAYABLE');
  const totalPayableRemaining = payableDebts.reduce((acc, d) => acc + (Number(d.remaining_amount) || 0), 0);
  const urgentDebts = debts
    .filter(
      (d) =>
        (d.type === 'BILL' && d.last_paid_period !== currentPeriod) ||
        (d.type === 'DEBT_PAYABLE' && Number(d.remaining_amount) > 0)
    )
    .slice(0, 3);

  const colorMap = {
    blue: 'border-l-4 border-l-blue-500 bg-blue-50/30',
    emerald: 'border-l-4 border-l-emerald-500 bg-emerald-50/30',
    amber: 'border-l-4 border-l-amber-500 bg-amber-50/30',
    indigo: 'border-l-4 border-l-indigo-500 bg-indigo-50/30',
    rose: 'border-l-4 border-l-rose-500 bg-rose-50/30',
  };

  return (
    <div className="space-y-6">
      {/* ROW 1: HERO TOTAL SALDO & DERETAN KANTONG (Bento di Desktop, Carousel di Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero Net Worth Card */}
        <div className="lg:col-span-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-200">
              Total Saldo Keluarga
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
              title="Sembunyikan/Tampilkan Saldo"
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
              {showBalance ? formatRupiah(totalNetWorth) : 'Rp ••••••••'}
            </h2>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                monthlyIncome >= monthlyExpense
                  ? 'bg-emerald-400/20 text-emerald-200'
                  : 'bg-rose-400/20 text-rose-200'
              }`}
            >
              {monthlyIncome >= monthlyExpense ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {monthlyIncome >= monthlyExpense ? 'Surplus Bulan Ini' : 'Defisit Bulan Ini'}:{' '}
                {showBalance ? formatRupiah(monthlyIncome - monthlyExpense) : '•••'}
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Wallet Cards (Horizontal Swipe di Mobile, Grid di Desktop) */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Kantong & Rekening Saldo</h3>
            <button
              onClick={onGoToWallets}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Kelola Kantong
            </button>
          </div>

          <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto no-scrollbar pb-1">
            {wallets.map((w) => (
              <div
                key={w.id}
                className={`min-w-[210px] md:min-w-0 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between ${
                  colorMap[w.color] || colorMap.blue
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200">
                    {w.type}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 truncate">{w.name}</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">
                    {showBalance ? formatRupiah(w.current_balance) : 'Rp ••••••'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 2: ARUS KAS BULANAN & PROPORSI KATEGORI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Kiri: Ringkasan Arus Kas & Batas Anggaran */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Arus Kas &amp; Anggaran Bulan Ini</h3>
            {onGoToReports && (
              <button
                onClick={onGoToReports}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 transition group"
              >
                <span>Lihat Rekap Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-500 text-white">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
                <span>Saldo Masuk</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {showBalance ? formatRupiah(monthlyIncome) : 'Rp ••••••'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100">
              <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold mb-1">
                <div className="p-1.5 rounded-lg bg-rose-500 text-white">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <span>Saldo Keluar</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {showBalance ? formatRupiah(monthlyExpense) : 'Rp ••••••'}
              </p>
            </div>
          </div>

          {/* Progress Bar Anggaran Bulanan */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-slate-700">Batas Anggaran Keluarga</span>
              <span className="font-bold text-slate-900">{budgetPercentage}% Terpakai</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetPercentage > 85
                    ? 'bg-rose-500'
                    : budgetPercentage > 65
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Terpakai {formatRupiah(monthlyExpense)} dari patokan anggaran {formatRupiah(monthlyBudget)} (Tidak termasuk mutasi antar kantong).
            </p>
          </div>
        </div>

        {/* Kanan: Proporsi Pengeluaran per Kategori */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Proporsi Pengeluaran Terbesar</h3>
          {categoryBreakdown.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
              Belum ada pengeluaran tercatat di bulan ini.
            </div>
          ) : (
            <div className="space-y-3.5">
              {categoryBreakdown.slice(0, 4).map((item, idx) => {
                const barColors = ['bg-rose-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500'];
                return (
                  <div key={item.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{item.name}</span>
                      <span className="text-slate-600 font-medium">
                        {formatRupiah(item.amount)} ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColors[idx % barColors.length]}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ROW TAGIHAN & HUTANG (Bento Widget) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Tagihan &amp; Cicilan Bulan Ini</h3>
              <p className="text-[11px] text-slate-400">Pantau jatuh tempo dan pelunasan kewajiban keluarga</p>
            </div>
          </div>
          <button
            onClick={onGoToDebts}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Buka Pengelola →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Kiri: Status Ringkas Tagihan & Sisa Hutang */}
          <div className="md:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">
                Tagihan Belum Bayar
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {showBalance ? formatRupiah(totalPendingBillsAmount) : '•••••'}
              </p>
              <span className="text-[10px] text-amber-600 font-medium mt-0.5">
                {pendingBills.length > 0 ? `${pendingBills.length} tagihan bulan ini` : 'Semua sudah lunas!'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                Sisa Pokok Hutang
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {showBalance ? formatRupiah(totalPayableRemaining) : '•••••'}
              </p>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                {payableDebts.length} pinjaman/cicilan aktif
              </span>
            </div>
          </div>

          {/* Kanan: Daftar Tagihan / Cicilan Terdekat */}
          <div className="md:col-span-7">
            {urgentDebts.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Kondisi keuangan aman! Belum ada tagihan tertunda bulan ini.</span>
                </div>
                <button
                  onClick={onGoToDebts}
                  className="font-bold text-indigo-600 hover:underline text-[11px]"
                >
                  + Tambah Catatan
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentDebts.map((item) => {
                  const isBill = item.type === 'BILL';
                  const isDuePassed = isBill && item.due_day && todayDay > Number(item.due_day);
                  return (
                    <div
                      key={item.id}
                      onClick={onGoToDebts}
                      className="p-2.5 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/60 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isDuePassed ? 'bg-rose-500' : isBill ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-400">
                            {isBill
                              ? `Jatuh tempo tgl ${item.due_day || '-'}`
                              : `Sisa ${formatRupiah(item.remaining_amount)}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-slate-900 block">
                          {formatRupiah(isBill ? (item.total_amount || item.installment_amount) : (item.installment_amount || item.total_amount))}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            isDuePassed
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isDuePassed ? 'Lewat Tempo' : isBill ? 'Belum Bayar' : 'Cicilan Aktif'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: TRANSAKSI TERKINI */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Transaksi Terkini</h3>
          <button
            onClick={onGoToHistory}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Lihat Semua Riwayat →
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-slate-500 mb-3">Belum ada transaksi tercatat.</p>
            <button
              onClick={onOpenQuickInput}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
            >
              + Catat Transaksi Pertama
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 6).map((trx) => {
              const isIncome = trx.type === 'INCOME';
              const isExpense = trx.type === 'EXPENSE';
              const isTransfer = trx.type === 'TRANSFER';

              return (
                <div
                  key={trx.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 px-2 rounded-xl transition"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Ikon Tipe Transaksi */}
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-600'
                          : isExpense
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {isIncome && <ArrowDownLeft className="w-5 h-5" />}
                      {isExpense && <ArrowUpRight className="w-5 h-5" />}
                      {isTransfer && <ArrowRightLeft className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-slate-900">
                          {isTransfer ? 'Mutasi / Pindah Saldo' : getCategoryName(trx.category_id)}
                        </p>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                          {trx.actor === 'Istri' ? '👩 Istri' : '👨 Suami'}
                        </span>
                        {trx.receipt_url && (
                          <button
                            onClick={() => onSelectReceipt(trx)}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold hover:bg-indigo-100 transition"
                          >
                            <Paperclip className="w-3 h-3" /> Lihat Struk
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">
                        {isIncome && `Masuk ke: ${getWalletName(trx.to_wallet_id)}`}
                        {isExpense && `Diambil dari: ${getWalletName(trx.from_wallet_id)}`}
                        {isTransfer &&
                          `${getWalletName(trx.from_wallet_id)} ➔ ${getWalletName(trx.to_wallet_id)}`}
                        {trx.notes ? ` • "${trx.notes}"` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between pl-11 sm:pl-0">
                    <span
                      className={`font-bold text-sm ${
                        isIncome
                          ? 'text-emerald-600'
                          : isExpense
                          ? 'text-rose-600'
                          : 'text-indigo-600'
                      }`}
                    >
                      {isIncome ? '+ ' : isExpense ? '- ' : ''}
                      {formatRupiah(trx.amount)}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatDateIndo(trx.date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}