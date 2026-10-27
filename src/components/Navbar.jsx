import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  History,
  Wallet,
  Tags,
  Plus,
  CalendarClock,
  FileSpreadsheet,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenQuickInput }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'history', label: 'Riwayat', icon: History },
    { id: 'debts', label: 'Tagihan & Hutang', icon: CalendarClock },
    { id: 'reports', label: 'Laporan & Rekap', icon: FileSpreadsheet },
    { id: 'wallets', label: 'Kantong', icon: Wallet },
    { id: 'categories', label: 'Kategori', icon: Tags },
  ];

  const moreItems = [
    {
      id: 'reports',
      label: 'Laporan & Rekap',
      desc: 'Analisis arus kas & unduh laporan PDF/CSV',
      icon: FileSpreadsheet,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      id: 'wallets',
      label: 'Kantong Saldo',
      desc: 'Kelola rekening bank, e-wallet, & pos virtual',
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      id: 'categories',
      label: 'Kategori Transaksi',
      desc: 'Atur pos belanja & sumber pemasukan',
      icon: Tags,
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  const isMoreActive = ['reports', 'wallets', 'categories'].includes(activeTab);

  return (
    <>
      {/* 1. DESKTOP LEFT SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed inset-y-0 left-0 z-30 p-6 justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200">
              Rp
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-tight">Family Money</h1>
              <p className="text-xs text-slate-500">Tracker Suami &amp; Istri</p>
            </div>
          </div>

          <button
            onClick={onOpenQuickInput}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition mb-8"
          >
            <Plus className="w-5 h-5" />
            <span>Catat Transaksi</span>
          </button>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">Google Cloud Aktif</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Tersinkronisasi otomatis dengan Google Sheets &amp; Google Drive.
          </p>
        </div>
      </aside>

      {/* 2. MOBILE BOTTOM NAVIGATION BAR (5 Kolom Simetris: 2 Kiri - 1 Tengah - 2 Kanan) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 px-2 py-1.5 grid grid-cols-5 items-center">
        {/* Kiri 1: Beranda */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl ${
            activeTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Beranda</span>
        </button>

        {/* Kiri 2: Riwayat */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl ${
            activeTab === 'history' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Riwayat</span>
        </button>

        {/* Tengah: Tombol + Catat (Tepat di kolom ke-3 dari 5 kolom) */}
        <div className="flex flex-col items-center justify-center">
          <button
            onClick={onOpenQuickInput}
            className="-mt-6 w-13 h-13 p-3.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-300 flex items-center justify-center active:scale-95 transition border-4 border-[#F8FAFC]"
            aria-label="Catat Transaksi"
          >
            <Plus className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-bold text-indigo-600 mt-0.5">Catat</span>
        </div>

        {/* Kanan 1: Tagihan & Hutang */}
        <button
          onClick={() => setActiveTab('debts')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl ${
            activeTab === 'debts' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <CalendarClock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Tagihan</span>
        </button>

        {/* Kanan 2: Menu Lainnya (Membuka Laporan, Kantong, & Kategori) */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            isMoreActive ? 'text-indigo-600 font-bold' : 'text-slate-400 font-medium'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">
            {activeTab === 'reports' ? 'Laporan' : activeTab === 'wallets' ? 'Kantong' : activeTab === 'categories' ? 'Kategori' : 'Lainnya'}
          </span>
        </button>
      </nav>

      {/* 3. MOBILE "LAINNYA" BOTTOM SHEET MODAL (VIA CREATE PORTAL) */}
      {isMoreOpen && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMoreOpen(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end justify-center p-0 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full rounded-t-3xl p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 border-t border-slate-200/80 max-h-[85vh] overflow-y-auto"
          >
            {/* Handle Drag bar */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-2 mb-3" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Menu Lainnya</h3>
                <p className="text-xs text-slate-500">Akses fitur keuangan lengkap lainnya</p>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 pt-1 pb-4">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMoreOpen(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition border text-left active:scale-[0.98] ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                        : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200/60 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${isActive ? 'text-indigo-600' : 'text-slate-900'}`}>
                          {item.label}
                        </h4>
                        <p className="text-[11px] text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-indigo-600 font-bold' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}