import { useState } from 'react';
import { Wallet, Tag } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

export default function SettingsView({ wallets, categories, onAddWallet, onAddCategory }) {
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState('Bank');
  const [initialBalance, setInitialBalance] = useState('');
  const [walletColor, setWalletColor] = useState('blue');

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('EXPENSE');
  const [loading, setLoading] = useState(false);

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (!walletName) return;
    setLoading(true);
    await onAddWallet({
      name: walletName,
      type: walletType,
      initial_balance: Number(initialBalance) || 0,
      color: walletColor,
    });
    setWalletName('');
    setInitialBalance('');
    setLoading(false);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catName) return;
    setLoading(true);
    await onAddCategory({ name: catName, type: catType });
    setCatName('');
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Kiri: Kelola Kantong Saldo */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900">Kelola Kantong & Rekening Saldo</h3>
        </div>

        <form onSubmit={handleCreateWallet} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <p className="text-xs font-bold text-slate-700">+ Tambah Kantong Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              placeholder="Nama (mis: Bank Mandiri / Dana Darurat)"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
            />
            <select
              value={walletType}
              onChange={(e) => setWalletType(e.target.value)}
              className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
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
              className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
            />
            <select
              value={walletColor}
              onChange={(e) => setWalletColor(e.target.value)}
              className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
            >
              <option value="blue">Warna Biru</option>
              <option value="emerald">Warna Hijau</option>
              <option value="amber">Warna Oranye</option>
              <option value="indigo">Warna Ungu Indigo</option>
              <option value="rose">Warna Merah Rose</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700"
          >
            Simpan Kantong Baru
          </button>
        </form>

        <div className="divide-y divide-slate-100">
          {wallets.map((w) => (
            <div key={w.id} className="py-3 flex justify-between items-center text-xs">
              <div>
                <p className="font-bold text-slate-800">{w.name}</p>
                <p className="text-slate-400">
                  {w.type} • Saldo Awal: {formatRupiah(w.initial_balance)}
                </p>
              </div>
              <span className="font-bold text-slate-900">{formatRupiah(w.current_balance)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanan: Kelola Kategori Pemasukan & Pengeluaran */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-900">Kelola Kategori Masuk & Keluar</h3>
        </div>

        <form onSubmit={handleCreateCategory} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <p className="text-xs font-bold text-slate-700">+ Tambah Kategori Baru</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              placeholder="Nama Kategori (mis: Honor B / Listrik)"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
            />
            <select
              value={catType}
              onChange={(e) => setCatType(e.target.value)}
              className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl"
            >
              <option value="EXPENSE">Kategori Saldo Keluar (Pengeluaran)</option>
              <option value="INCOME">Kategori Saldo Masuk (Pemasukan)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
          >
            Simpan Kategori Baru
          </button>
        </form>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-emerald-600 mb-2">Asal Saldo Masuk (INCOME)</p>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {categories.filter((c) => c.type === 'INCOME').map((c) => (
                <li key={c.id} className="px-3 py-1.5 rounded-lg bg-emerald-50/60 font-medium">
                  • {c.name}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold text-rose-600 mb-2">Pos Saldo Keluar (EXPENSE)</p>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {categories.filter((c) => c.type === 'EXPENSE').map((c) => (
                <li key={c.id} className="px-3 py-1.5 rounded-lg bg-rose-50/60 font-medium">
                  • {c.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}