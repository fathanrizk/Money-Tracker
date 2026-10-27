import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Plus, TrendingDown, TrendingUp, Pencil, Trash2, X } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';

export default function WalletsView({
  wallets,
  //transactions = [],
  onAddWallet,
  onUpdateWallet,
  onDeleteWallet,
}) {
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('Bank');
  const [initialBalance, setInitialBalance] = useState('');
  const [walletColor, setWalletColor] = useState('blue');
  const [loading, setLoading] = useState(false);

  // State untuk Modal Edit Kantong
  const [editingWallet, setEditingWallet] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('Bank');
  const [editInitialBalance, setEditInitialBalance] = useState('');
  const [editColor, setEditColor] = useState('blue');
  const [editLoading, setEditLoading] = useState(false);

  // State untuk Modal Konfirmasi Hapus Kantong
  const [walletToDelete, setWalletToDelete] = useState(null);

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!walletName) return;
    setLoading(true);
    try {
      await onAddWallet({
        name: walletName,
        type: walletType,
        initial_balance: Number(initialBalance) || 0,
        color: walletColor,
      });
      setWalletName('');
      setInitialBalance('');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (w) => {
    setEditingWallet(w);
    setEditName(w.name || '');
    setEditType(w.type || 'Bank');
    setEditInitialBalance(w.initial_balance !== undefined ? String(w.initial_balance) : '0');
    setEditColor(w.color || 'blue');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName || !editingWallet) return;
    setEditLoading(true);
    try {
      await onUpdateWallet({
        id: editingWallet.id,
        name: editName,
        type: editType,
        initial_balance: Number(editInitialBalance) || 0,
        color: editColor,
      });
      setEditingWallet(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (w) => {
    setWalletToDelete(w);
  };

  const colorMap = {
    blue: 'border-l-4 border-l-blue-500 bg-blue-50/40',
    emerald: 'border-l-4 border-l-emerald-500 bg-emerald-50/40',
    amber: 'border-l-4 border-l-amber-500 bg-amber-50/40',
    indigo: 'border-l-4 border-l-indigo-500 bg-indigo-50/40',
    rose: 'border-l-4 border-l-rose-500 bg-rose-50/40',
  };

  const colorDotMap = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-base">Kantong &amp; Rekening Saldo</h2>
          <p className="text-xs text-slate-500">Kelola semua pos penyimpanan uang keluarga (Tambah, Edit, Hapus)</p>
        </div>
      </div>

      {/* Form Tambah Kantong Baru */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-indigo-600" />
          Tambah Kantong Baru
        </p>
        <form onSubmit={handleCreateWallet} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              placeholder="Nama (mis: Bank Mandiri / Dana Darurat)"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              className="p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={walletType}
              onChange={(e) => setWalletType(e.target.value)}
              className="p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="Bank">Rekening Bank</option>
              <option value="Pos Virtual">Pos Alokasi Virtual</option>
              <option value="E-Wallet">E-Wallet</option>
              <option value="Tunai">Kas Tunai</option>
            </select>
            <input
              type="number"
              placeholder="Saldo Awal (Rp)"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <select
              value={walletColor}
              onChange={(e) => setWalletColor(e.target.value)}
              className="p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="blue">🔵 Warna Biru</option>
              <option value="emerald">🟢 Warna Hijau</option>
              <option value="amber">🟠 Warna Oranye</option>
              <option value="indigo">🟣 Warna Ungu Indigo</option>
              <option value="rose">🔴 Warna Merah Rose</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition shadow-sm"
          >
            {loading ? 'Menyimpan...' : '+ Simpan Kantong Baru'}
          </button>
        </form>
      </div>

      {/* Katalog Kantong Aktif */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-4">
          Katalog Kantong Aktif ({wallets.length} Kantong)
        </h3>

        {wallets.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Belum ada kantong. Tambahkan kantong pertama di atas.
          </div>
        ) : (
          <div className="space-y-3">
            {wallets.map((w) => {
              const netFlow = (Number(w.current_balance) || 0) - (Number(w.initial_balance) || 0);
              return (
                <div
                  key={w.id}
                  className={`p-4 rounded-xl border border-slate-200/80 ${colorMap[w.color] || colorMap.blue}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Kiri: info kantong */}
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${colorDotMap[w.color] || colorDotMap.blue}`} />
                      <div>
                        <p className="font-bold text-sm text-slate-900">{w.name}</p>
                        <span className="inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200 mt-0.5">
                          {w.type}
                        </span>
                      </div>
                    </div>

                    {/* Kanan: saldo saat ini + tombol aksi Edit & Hapus */}
                    <div className="flex items-center gap-3">
                      <div className="text-right shrink-0">
                        <p className="font-extrabold text-base text-slate-900">
                          {formatRupiah(w.current_balance)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Saldo Saat Ini</p>
                      </div>

                      <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                        <button
                          onClick={() => openEditModal(w)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition"
                          title="Edit Kantong"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(w)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                          title="Hapus Kantong"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detail baris bawah */}
                  <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <p className="text-slate-400 font-medium">Saldo Awal</p>
                      <p className="font-bold text-slate-700">{formatRupiah(w.initial_balance)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Total Masuk</p>
                      <p className="font-bold text-emerald-600">
                        {formatRupiah(w.total_in ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Total Keluar</p>
                      <p className="font-bold text-rose-600">
                        {formatRupiah(w.total_out ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Indikator pergerakan saldo */}
                  <div className={`mt-2 flex items-center gap-1 text-[11px] font-semibold ${netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {netFlow >= 0
                      ? <TrendingUp className="w-3.5 h-3.5" />
                      : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>
                      {netFlow >= 0 ? '+' : ''}{formatRupiah(netFlow)} dari saldo awal
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL EDIT KANTONG */}
      {editingWallet && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingWallet(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Edit Kantong Saldo</h4>
                  <p className="text-xs text-slate-500">Perbarui informasi kantong ini</p>
                </div>
              </div>
              <button
                onClick={() => setEditingWallet(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kantong
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipe Kantong
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="Bank">Rekening Bank</option>
                  <option value="Pos Virtual">Pos Alokasi Virtual</option>
                  <option value="E-Wallet">E-Wallet</option>
                  <option value="Tunai">Kas Tunai</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo Awal (Rp)
                </label>
                <input
                  type="number"
                  value={editInitialBalance}
                  onChange={(e) => setEditInitialBalance(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warna Kartu
                </label>
                <select
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="blue">🔵 Warna Biru</option>
                  <option value="emerald">🟢 Warna Hijau</option>
                  <option value="amber">🟠 Warna Oranye</option>
                  <option value="indigo">🟣 Warna Ungu Indigo</option>
                  <option value="rose">🔴 Warna Merah Rose</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingWallet(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL KONFIRMASI HAPUS KANTONG */}
      <ConfirmModal
        isOpen={!!walletToDelete}
        title="Hapus Kantong Saldo?"
        message={
          walletToDelete
            ? `Apakah Anda yakin ingin menghapus kantong "${walletToDelete.name}"?\nSaldo atau transaksi terkait kantong ini tidak akan otomatis terhapus namun referensi kantong akan hilang.`
            : ''
        }
        confirmText="Ya, Hapus Kantong"
        onConfirm={() => {
          if (walletToDelete) {
            onDeleteWallet(walletToDelete.id);
            setWalletToDelete(null);
          }
        }}
        onClose={() => setWalletToDelete(null)}
      />
    </div>
  );
}
