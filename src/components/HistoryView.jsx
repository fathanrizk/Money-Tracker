import { useState } from 'react';
import { Search, Trash2, Pencil, Paperclip, ArrowDownLeft, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import ConfirmModal from './ConfirmModal';

export default function HistoryView({
  transactions,
  wallets,
  categories,
  onDeleteTransaction,
  onEditTransaction,
  onSelectReceipt,
}) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterWallet, setFilterWallet] = useState('ALL');
  const [filterActor, setFilterActor] = useState('ALL');
  const [trxToDelete, setTrxToDelete] = useState(null);

  const getWalletName = (id) => wallets.find((w) => w.id === id)?.name || '-';
  const getCategoryName = (id) => categories.find((c) => c.id === id)?.name || 'Mutasi Saldo';

  const filtered = transactions.filter((t) => {
    const matchType = filterType === 'ALL' || t.type === filterType;
    const matchActor = filterActor === 'ALL' || t.actor === filterActor;
    const matchWallet =
      filterWallet === 'ALL' ||
      t.from_wallet_id === filterWallet ||
      t.to_wallet_id === filterWallet;
    const catName = getCategoryName(t.category_id).toLowerCase();
    const noteText = (t.notes || '').toLowerCase();
    const matchSearch =
      catName.includes(search.toLowerCase()) || noteText.includes(search.toLowerCase());

    return matchType && matchActor && matchWallet && matchSearch;
  });

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
      <h2 className="font-bold text-slate-900 text-base">Riwayat & Filter Transaksi</h2>

      {/* Baris Pencarian & Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari catatan atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
        >
          <option value="ALL">Semua Tipe Transaksi</option>
          <option value="INCOME">Saldo Masuk</option>
          <option value="EXPENSE">Saldo Keluar</option>
          <option value="TRANSFER">Mutasi Saldo</option>
        </select>

        <select
          value={filterWallet}
          onChange={(e) => setFilterWallet(e.target.value)}
          className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
        >
          <option value="ALL">Semua Kantong Saldo</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <select
          value={filterActor}
          onChange={(e) => setFilterActor(e.target.value)}
          className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
        >
          <option value="ALL">Pelaku: Suami & Istri</option>
          <option value="Suami">👨 Khusus Suami</option>
          <option value="Istri">👩 Khusus Istri</option>
        </select>
      </div>

      {/* Daftar Transaksi */}
      {filtered.length === 0 ? (
        <p className="text-center py-12 text-xs text-slate-400">
          Tidak ada transaksi yang cocok dengan filter.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((trx) => {
            const isIncome = trx.type === 'INCOME';
            const isExpense = trx.type === 'EXPENSE';
            return (
              <div key={trx.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isIncome
                        ? 'bg-emerald-50 text-emerald-600'
                        : isExpense
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {isIncome && <ArrowDownLeft className="w-4 h-4" />}
                    {isExpense && <ArrowUpRight className="w-4 h-4" />}
                    {!isIncome && !isExpense && <ArrowRightLeft className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">
                        {trx.type === 'TRANSFER' ? 'Mutasi Saldo' : getCategoryName(trx.category_id)}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {trx.actor}
                      </span>
                      {trx.receipt_url && (
                        <button
                          onClick={() => onSelectReceipt(trx)}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold"
                        >
                          <Paperclip className="w-3 h-3" /> Lihat Struk
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDateIndo(trx.date)} •{' '}
                      {isIncome && `Ke: ${getWalletName(trx.to_wallet_id)}`}
                      {isExpense && `Dari: ${getWalletName(trx.from_wallet_id)}`}
                      {trx.type === 'TRANSFER' &&
                        `${getWalletName(trx.from_wallet_id)} ➔ ${getWalletName(trx.to_wallet_id)}`}
                      {trx.notes ? ` • "${trx.notes}"` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-bold text-sm ${
                      isIncome ? 'text-emerald-600' : isExpense ? 'text-rose-600' : 'text-indigo-600'
                    }`}
                  >
                    {isIncome ? '+ ' : isExpense ? '- ' : ''}
                    {formatRupiah(trx.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditTransaction(trx)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Transaksi"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTrxToDelete(trx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS TRANSAKSI */}
      <ConfirmModal
        isOpen={!!trxToDelete}
        title="Hapus Transaksi?"
        message={
          trxToDelete
            ? `Hapus transaksi sebesar ${formatRupiah(trxToDelete.amount)} (${getCategoryName(trxToDelete.category_id)})?\nSaldo kantong terkait akan otomatis disesuaikan/dikembalikan.`
            : ''
        }
        confirmText="Ya, Hapus Transaksi"
        onConfirm={() => {
          if (trxToDelete) {
            onDeleteTransaction(trxToDelete.id);
            setTrxToDelete(null);
          }
        }}
        onClose={() => setTrxToDelete(null)}
      />
    </div>
  );
}