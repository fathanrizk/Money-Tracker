import { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
  Tags,
  Users,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Search,
} from 'lucide-react';
import { formatRupiah, formatDateIndo, getTodayISO } from '../utils/formatters';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function ReportsView({
  transactions = [],
  wallets = [],
  categories = [],
  debts = [],
  onSelectReceipt,
}) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIdx = today.getMonth(); // 0 - 11

  // Mode Periode: 'MONTHLY' atau 'CUSTOM'
  const [periodMode, setPeriodMode] = useState('MONTHLY');
  
  // State untuk Mode Bulanan
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // State untuk Mode Kustom
  const firstDayOfMonth = new Date(currentYear, currentMonthIdx, 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(getTodayISO());

  // Search filter di tabel transaksi
  const [tableSearch, setTableSearch] = useState('');

  // 1. Tentukan rentang tanggal efektif berdasarkan mode
  const { periodLabel, filteredTransactions, dateRangeStart, dateRangeEnd } = useMemo(() => {
    let start = '';
    let end = '';
    let label = '';

    if (periodMode === 'MONTHLY') {
      const startObj = new Date(selectedYear, selectedMonth, 1);
      const endObj = new Date(selectedYear, selectedMonth + 1, 0);
      start = startObj.toISOString().split('T')[0];
      end = endObj.toISOString().split('T')[0];
      label = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    } else {
      start = startDate || '2000-01-01';
      end = endDate || '2099-12-31';
      label = `${formatDateIndo(start)} — ${formatDateIndo(end)}`;
    }

    const filtered = transactions.filter((t) => {
      if (!t.date) return false;
      const tDate = t.date.substring(0, 10);
      return tDate >= start && tDate <= end;
    });

    // Urutkan transaksi dari yang terbaru
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      periodLabel: label,
      filteredTransactions: filtered,
      dateRangeStart: start,
      dateRangeEnd: end,
    };
  }, [periodMode, selectedMonth, selectedYear, startDate, endDate, transactions]);

  // 2. Kalkulasi Ringkasan Keuangan
  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    let transferCount = 0;

    const expenseByCat = {};
    const incomeByCat = {};
    const walletFlow = {}; // { walletId: { in: 0, out: 0 } }
    const actorStats = {
      Suami: { income: 0, expense: 0, count: 0 },
      Istri: { income: 0, expense: 0, count: 0 },
      Lainnya: { income: 0, expense: 0, count: 0 },
    };

    wallets.forEach((w) => {
      walletFlow[w.id] = { in: 0, out: 0, name: w.name, type: w.type };
    });

    filteredTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      const actorKey = t.actor === 'Suami' ? 'Suami' : t.actor === 'Istri' ? 'Istri' : 'Lainnya';

      if (t.type === 'INCOME') {
        totalIncome += amt;
        incomeCount++;
        const cat = categories.find((c) => c.id === t.category_id);
        const cName = cat ? cat.name : 'Pemasukan Lain';
        expenseByCat[cName] = expenseByCat[cName] || 0;
        incomeByCat[cName] = (incomeByCat[cName] || 0) + amt;

        if (t.to_wallet_id && walletFlow[t.to_wallet_id]) {
          walletFlow[t.to_wallet_id].in += amt;
        }
        actorStats[actorKey].income += amt;
        actorStats[actorKey].count++;
      } else if (t.type === 'EXPENSE') {
        totalExpense += amt;
        expenseCount++;
        const cat = categories.find((c) => c.id === t.category_id);
        const cName = cat ? cat.name : 'Pengeluaran Lain';
        expenseByCat[cName] = (expenseByCat[cName] || 0) + amt;

        if (t.from_wallet_id && walletFlow[t.from_wallet_id]) {
          walletFlow[t.from_wallet_id].out += amt;
        }
        actorStats[actorKey].expense += amt;
        actorStats[actorKey].count++;
      } else if (t.type === 'TRANSFER') {
        transferCount++;
        if (t.from_wallet_id && walletFlow[t.from_wallet_id]) {
          walletFlow[t.from_wallet_id].out += amt;
        }
        if (t.to_wallet_id && walletFlow[t.to_wallet_id]) {
          walletFlow[t.to_wallet_id].in += amt;
        }
        actorStats[actorKey].count++;
      }
    });

    const netCashflow = totalIncome - totalExpense;
    const savingRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

    // Urutkan kategori pengeluaran terbesar
    const sortedExpenses = Object.entries(expenseByCat)
      .map(([name, amount]) => ({
        name,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpense,
      netCashflow,
      savingRate,
      incomeCount,
      expenseCount,
      transferCount,
      sortedExpenses,
      walletFlow: Object.values(walletFlow),
      actorStats,
    };
  }, [filteredTransactions, wallets, categories]);

  // 3. Status Tagihan pada periode terpilih (khusus jika mode bulanan)
  const debtsSummary = useMemo(() => {
    const periodKey = periodMode === 'MONTHLY' 
      ? `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
      : dateRangeEnd.substring(0, 7);

    const billsPaid = debts.filter(
      (d) => d.type === 'BILL' && d.last_paid_period === periodKey
    );
    const billsUnpaid = debts.filter(
      (d) => d.type === 'BILL' && d.last_paid_period !== periodKey
    );

    return {
      billsPaid,
      billsUnpaid,
      periodKey,
    };
  }, [debts, periodMode, selectedMonth, selectedYear, dateRangeEnd]);

  // Handler Print / Download PDF
  const handlePrint = () => {
    window.print();
  };

  // Handler Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada transaksi pada periode ini untuk diunduh.');
      return;
    }

    const headers = ['ID', 'Tanggal', 'Tipe', 'Kategori', 'Kantong Asal', 'Kantong Tujuan', 'Pelaku', 'Nominal (Rp)', 'Catatan'];
    const rows = filteredTransactions.map((t) => {
      const cat = categories.find((c) => c.id === t.category_id)?.name || '';
      const wFrom = wallets.find((w) => w.id === t.from_wallet_id)?.name || '';
      const wTo = wallets.find((w) => w.id === t.to_wallet_id)?.name || '';
      return [
        `"${t.id || ''}"`,
        `"${t.date || ''}"`,
        `"${t.type || ''}"`,
        `"${cat}"`,
        `"${wFrom}"`,
        `"${wTo}"`,
        `"${t.actor || ''}"`,
        t.amount || 0,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap-keuangan-${periodLabel.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter pencarian tabel transaksi
  const searchedTransactions = useMemo(() => {
    if (!tableSearch.trim()) return filteredTransactions;
    const q = tableSearch.toLowerCase();
    return filteredTransactions.filter((t) => {
      const cat = categories.find((c) => c.id === t.category_id)?.name || '';
      const notes = t.notes || '';
      const actor = t.actor || '';
      return (
        cat.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q) ||
        actor.toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    });
  }, [filteredTransactions, tableSearch, categories]);

  return (
    <div className="space-y-6">
      {/* 1. HEADER HALAMAN & ACTION TOOLBAR (SCREEN ONLY) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Laporan &amp; Rekap Keuangan</h2>
          </div>
          <p className="text-xs text-slate-500">
            Analisis arus kas, persentase pengeluaran, perbandingan Suami/Istri, dan ekspor laporan
          </p>
        </div>

        {/* Action Buttons: Cetak PDF & Unduh CSV */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95 border border-slate-200"
            title="Download Spreadsheet CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition active:scale-95"
            title="Buka dialog cetak atau Simpan sebagai PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER PERIODE (SCREEN ONLY) */}
      <div className="no-print bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        {/* Toggle Mode: Bulanan vs Kustom */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setPeriodMode('MONTHLY')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                periodMode === 'MONTHLY'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Rekap Bulanan</span>
            </button>

            <button
              onClick={() => setPeriodMode('CUSTOM')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                periodMode === 'CUSTOM'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Rentang Tanggal Kustom</span>
            </button>
          </div>

          <span className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Periode Terpilih: <span className="text-indigo-600">{periodLabel}</span>
          </span>
        </div>

        {/* Input Form Filter Sesuai Mode */}
        {periodMode === 'MONTHLY' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Pilih Bulan</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Pilih Tahun</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedMonth(currentMonthIdx);
                  setSelectedYear(currentYear);
                }}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentMonthIdx === 0) {
                    setSelectedMonth(11);
                    setSelectedYear(currentYear - 1);
                  } else {
                    setSelectedMonth(currentMonthIdx - 1);
                    setSelectedYear(currentYear);
                  }
                }}
                className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Bulan Lalu
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Tanggal Selesai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const end = getTodayISO();
                  const startObj = new Date();
                  startObj.setDate(startObj.getDate() - 30);
                  setStartDate(startObj.toISOString().split('T')[0]);
                  setEndDate(end);
                }}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                30 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate(`${currentYear}-01-01`);
                  setEndDate(getTodayISO());
                }}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Tahun Ini
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. DOKUMEN REKAP SUMMARY UTAMA (TAMPIL DI SCREEN & TERCETAK DI PDF) */}
      <div className="print-area space-y-6">
        {/* HEADER DOKUMEN CETAK (HANYA MUNCUL DI PRINT PDF) */}
        <div className="print-only border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                Family Money Tracker
              </h1>
              <p className="text-sm font-bold text-indigo-600">Laporan &amp; Ringkasan Arus Kas Keluarga</p>
              <p className="text-xs text-slate-500 mt-1">
                Dicetak pada: {formatDateIndo(getTodayISO())}
              </p>
            </div>
            <div className="text-right">
              <div className="px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg inline-block">
                <span className="text-xs font-bold text-slate-800">
                  Periode: {periodLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. KARTU BENTO METRIK UTAMA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Pemasukan */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                Total Pemasukan
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatRupiah(summary.totalIncome)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary.incomeCount} transaksi masuk
              </p>
            </div>
          </div>

          {/* Card 2: Total Pengeluaran */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Total Pengeluaran
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatRupiah(summary.totalExpense)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary.expenseCount} transaksi belanja
              </p>
            </div>
          </div>

          {/* Card 3: Arus Kas Bersih (Net Cashflow) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sisa / Arus Kas Bersih
              </span>
              <div
                className={`p-2 rounded-xl ${
                  summary.netCashflow >= 0
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3
                className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                  summary.netCashflow >= 0 ? 'text-indigo-600' : 'text-rose-600'
                }`}
              >
                {formatRupiah(summary.netCashflow)}
              </h3>
              <span
                className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  summary.netCashflow >= 0
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {summary.netCashflow >= 0 ? 'Surplus Finansial' : 'Defisit (Pengeluaran > Pemasukan)'}
              </span>
            </div>
          </div>

          {/* Card 4: Rasio Tabungan / Penghematan */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Rasio Tabungan
              </span>
              <span className="text-xs font-bold text-slate-500">
                {summary.savingRate}%
              </span>
            </div>
            <div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.savingRate >= 20 ? 'bg-emerald-500' : summary.savingRate > 0 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, summary.savingRate))}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {summary.savingRate >= 20
                  ? 'Sehat! Mampu menabung di atas 20% pemasukan.'
                  : summary.savingRate > 0
                  ? 'Perlu evaluasi pos belanja agar bisa menabung lebih banyak.'
                  : 'Pengeluaran melebihi dana pemasukan.'}
              </p>
            </div>
          </div>
        </div>

        {/* 5. DUA KOLOM: BREAKDOWN PENGELUARAN & KONTRIBUSI SUAMI-ISTRI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Kolom Kiri: Breakdown Pos Belanja / Kategori */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Tags className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Pengeluaran per Kategori</h4>
                  <p className="text-xs text-slate-500">Distribusi belanja pada periode ini</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {summary.sortedExpenses.length} Kategori
              </span>
            </div>

            {summary.sortedExpenses.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada transaksi pengeluaran pada periode ini.
              </div>
            ) : (
              <div className="space-y-3">
                {summary.sortedExpenses.map((cat, idx) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px] w-4">{idx + 1}.</span>
                        {cat.name}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatRupiah(cat.amount)}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">({cat.percentage}%)</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kolom Kanan: Distribusi Suami vs Istri & Status Tagihan */}
          <div className="space-y-4">
            {/* Box 1: Kontribusi Pelaku Transaksi */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Pencatatan Suami &amp; Istri</h4>
                  <p className="text-xs text-slate-500">Kontribusi aktivitas transaksi bersama</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Suami */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 block mb-1">👨 Suami</span>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Pemasukan:</span>
                      <span className="font-bold text-emerald-600">
                        {formatRupiah(summary.actorStats.Suami.income)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Pengeluaran:</span>
                      <span className="font-bold text-rose-600">
                        {formatRupiah(summary.actorStats.Suami.expense)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200">
                      <span className="text-slate-400">Total Catatan:</span>
                      <span className="font-semibold text-slate-700">
                        {summary.actorStats.Suami.count} trx
                      </span>
                    </div>
                  </div>
                </div>

                {/* Istri */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                  <span className="text-xs font-bold text-slate-800 block mb-1">👩 Istri</span>
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Pemasukan:</span>
                      <span className="font-bold text-emerald-600">
                        {formatRupiah(summary.actorStats.Istri.income)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Pengeluaran:</span>
                      <span className="font-bold text-rose-600">
                        {formatRupiah(summary.actorStats.Istri.expense)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200">
                      <span className="text-slate-400">Total Catatan:</span>
                      <span className="font-semibold text-slate-700">
                        {summary.actorStats.Istri.count} trx
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Ringkasan Tagihan & Cicilan Periode Ini */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800">
                  Status Tagihan Periode ({debtsSummary.periodKey})
                </span>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                  {debtsSummary.billsPaid.length} Lunas / {debtsSummary.billsPaid.length + debtsSummary.billsUnpaid.length} Total
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-bold block flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Sudah Dibayar
                  </span>
                  <span className="font-extrabold text-slate-900 mt-0.5 block">
                    {debtsSummary.billsPaid.length} Tagihan
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[10px] text-amber-700 font-bold block flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Belum Dibayar
                  </span>
                  <span className="font-extrabold text-slate-900 mt-0.5 block">
                    {debtsSummary.billsUnpaid.length} Tagihan
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. TABEL ARUS KAS PER KANTONG SALDO */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Arus Kas Masuk &amp; Keluar per Kantong</h4>
              <p className="text-xs text-slate-500">Pergerakan saldo pada masing-masing rekening &amp; pos kas</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Nama Kantong</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3 text-right">Uang Masuk (+)</th>
                  <th className="py-2.5 px-3 text-right">Uang Keluar (-)</th>
                  <th className="py-2.5 px-3 text-right">Perubahan Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.walletFlow.map((w) => {
                  const diff = w.in - w.out;
                  return (
                    <tr key={w.name} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{w.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{w.type}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                        {w.in > 0 ? formatRupiah(w.in) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                        {w.out > 0 ? formatRupiah(w.out) : '-'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-extrabold ${
                          diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {diff > 0 ? `+${formatRupiah(diff)}` : diff < 0 ? formatRupiah(diff) : 'Rp 0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 7. TABEL RINCIAN TRANSAKSI PERIODE */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                Rincian Transaksi ({filteredTransactions.length} Transaksi)
              </h4>
              <p className="text-xs text-slate-500">Daftar pencatatan keuangan pada periode {periodLabel}</p>
            </div>

            {/* Kolom Pencarian Filter Cepat (Screen Only) */}
            <div className="no-print relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Cari transaksi..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {searchedTransactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Tidak ada catatan transaksi pada filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Kantong</th>
                    <th className="py-2.5 px-3">Catatan</th>
                    <th className="py-2.5 px-3">Pelaku</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {searchedTransactions.map((t) => {
                    const cat = categories.find((c) => c.id === t.category_id)?.name || '-';
                    const wFrom = wallets.find((w) => w.id === t.from_wallet_id)?.name;
                    const wTo = wallets.find((w) => w.id === t.to_wallet_id)?.name;
                    const walletDesc = t.type === 'TRANSFER'
                      ? `${wFrom || '?'} ➔ ${wTo || '?'}`
                      : t.type === 'INCOME'
                      ? (wTo || '-')
                      : (wFrom || '-');

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">
                          {formatDateIndo(t.date)}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.type === 'INCOME'
                                ? 'bg-emerald-50 text-emerald-700'
                                : t.type === 'EXPENSE'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {t.type === 'INCOME' ? 'Masuk' : t.type === 'EXPENSE' ? 'Keluar' : 'Transfer'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-medium">{cat}</td>
                        <td className="py-2 px-3 text-slate-600">{walletDesc}</td>
                        <td className="py-2 px-3 text-slate-500 max-w-[200px] truncate">{t.notes || '-'}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-700">{t.actor || 'Bersama'}</span>
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                            t.type === 'INCOME'
                              ? 'text-emerald-600'
                              : t.type === 'EXPENSE'
                              ? 'text-rose-600'
                              : 'text-indigo-600'
                          }`}
                        >
                          {t.type === 'INCOME' ? `+${formatRupiah(t.amount)}` : t.type === 'EXPENSE' ? `-${formatRupiah(t.amount)}` : formatRupiah(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 8. FOOTER LEMBAR PENGESAHAN LAPORAN (PRINT ONLY) */}
        <div className="print-only pt-8 mt-10 border-t border-slate-300">
          <div className="flex justify-between items-end px-8 text-xs text-slate-700">
            <div className="text-center space-y-12">
              <p className="font-semibold">Disetujui oleh Suami,</p>
              <p className="font-bold border-t border-slate-400 pt-1 px-6">( Suami )</p>
            </div>
            <div className="text-center space-y-12">
              <p className="font-semibold">Disetujui oleh Istri,</p>
              <p className="font-bold border-t border-slate-400 pt-1 px-6">( Istri )</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
