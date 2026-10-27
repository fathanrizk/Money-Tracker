import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Check, Loader2 } from 'lucide-react';
import { getTodayISO } from '../utils/formatters';
import { compressImageToBase64 } from '../services/api';

export default function QuickInputModal({
  isOpen,
  onClose,
  wallets,
  categories,
  defaultActor,
  editData = null,
  onSaveTransaction,
}) {
  const [type, setType] = useState('EXPENSE'); // INCOME | EXPENSE | TRANSFER
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [actor, setActor] = useState(defaultActor || 'Suami');
  const [date, setDate] = useState(getTodayISO);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (editData) {
      setType(editData.type || 'EXPENSE');
      setAmount(editData.amount !== undefined ? String(editData.amount) : '');
      setCategoryId(editData.category_id || '');
      setFromWalletId(editData.from_wallet_id || '');
      setToWalletId(editData.to_wallet_id || '');
      setActor(editData.actor || defaultActor || 'Suami');
      setDate(editData.date ? editData.date.substring(0, 10) : getTodayISO());
      setNotes(editData.notes || '');
      setReceiptFile(null);
    } else {
      setType('EXPENSE');
      setAmount('');
      const defaultCats = categories.filter((c) => c.type === 'EXPENSE');
      setCategoryId(defaultCats[0]?.id || '');
      setFromWalletId(wallets[0]?.id || '');
      setToWalletId(wallets.length > 1 ? wallets[1].id : wallets[0]?.id || '');
      setActor(defaultActor || 'Suami');
      setDate(getTodayISO());
      setNotes('');
      setReceiptFile(null);
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);
  const activeFromWalletId = fromWalletId || wallets[0]?.id || '';
  const activeToWalletId = toWalletId || (wallets.length > 1 ? wallets[1].id : wallets[0]?.id || '');
  const activeCategoryId = categoryId || filteredCategories[0]?.id || '';

  const handleTypeChange = (newType) => {
    setType(newType);
    const filteredCats = categories.filter((c) => c.type === (newType === 'INCOME' ? 'INCOME' : 'EXPENSE'));
    if (filteredCats.length > 0) {
      setCategoryId(filteredCats[0].id);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToBase64(file);
      setReceiptFile(compressed);
    } catch {
      setErrorMsg('Gagal memproses gambar struk.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Masukkan nominal uang yang valid.');
      return;
    }
    if (type === 'TRANSFER' && activeFromWalletId === activeToWalletId) {
      setErrorMsg('Kantong asal dan kantong tujuan tidak boleh sama.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveTransaction({
        ...(editData ? { id: editData.id } : {}),
        date,
        type,
        amount: Number(amount),
        category_id: type === 'TRANSFER' ? '' : activeCategoryId,
        from_wallet_id: type === 'INCOME' ? '' : activeFromWalletId,
        to_wallet_id: type === 'EXPENSE' ? '' : activeToWalletId,
        actor,
        notes,
        receipt_base64: receiptFile ? receiptFile.base64 : '',
        receipt_name: receiptFile ? receiptFile.name : '',
        receipt_mime: receiptFile ? receiptFile.mime : '',
      });
      // Reset form setelah sukses
      setAmount('');
      setNotes('');
      setReceiptFile(null);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-slate-900">
            {editData ? 'Edit Transaksi' : 'Catat Transaksi Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Segmented Tabs: Saldo Masuk | Saldo Keluar | Mutasi */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => handleTypeChange('INCOME')}
            className={`py-2.5 text-xs font-bold rounded-xl transition ${
              type === 'INCOME'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            + Saldo Masuk
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('EXPENSE')}
            className={`py-2.5 text-xs font-bold rounded-xl transition ${
              type === 'EXPENSE'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            - Saldo Keluar
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('TRANSFER')}
            className={`py-2.5 text-xs font-bold rounded-xl transition ${
              type === 'TRANSFER'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⇄ Mutasi Saldo
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Nominal Besar */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              Nominal (Rupiah)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 text-2xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Pilihan Dinamis Berdasarkan Tab */}
          {type === 'INCOME' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Asal Pemasukan (Kategori)
                </label>
                <select
                  value={activeCategoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl font-medium"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Masuk ke Kantong Mana?
                </label>
                <select
                  value={activeToWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'EXPENSE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Diambil dari Kantong Mana?
                </label>
                <select
                  value={activeFromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl font-medium"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Untuk Keperluan (Kategori)
                </label>
                <select
                  value={activeCategoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl font-medium"
                >
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {type === 'TRANSFER' && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">
                    Dari Kantong Asal
                  </label>
                  <select
                    value={activeFromWalletId}
                    onChange={(e) => setFromWalletId(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-indigo-200 rounded-xl font-medium"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">
                    Ke Kantong Tujuan
                  </label>
                  <select
                    value={activeToWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full p-2.5 text-sm bg-white border border-indigo-200 rounded-xl font-medium"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-indigo-600">
                *Mutasi hanya memindahkan saldo antar kantong tanpa dihitung sebagai pengeluaran.
              </p>
            </div>
          )}

          {/* Baris Pelaku (Suami/Istri) & Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Dicatat Oleh</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                {['Suami', 'Istri'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActor(role)}
                    className={`py-2 text-xs font-bold rounded-lg transition ${
                      actor === role ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {role === 'Suami' ? '👨 Suami' : '👩 Istri'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Catatan Singkat */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Beli kopi berdua, Honor proyek..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl"
            />
          </div>

          {/* Kotak Upload Foto Struk / Bukti Transfer (Ke Google Drive) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Bukti Struk / Transfer (Tersimpan ke Google Drive)
            </label>
            {!receiptFile ? (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 transition">
                <Camera className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-600">
                  Ambil Foto Struk / Pilih dari Galeri
                </span>
                <span className="text-[11px] text-slate-400">Otomatis dikompres ringan</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <img
                    src={receiptFile.base64}
                    alt="Preview Struk"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-300"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                      {receiptFile.name}
                    </p>
                    <p className="text-[11px] text-emerald-600 font-medium">
                      ✓ Siap diunggah ke Google Drive
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="text-xs text-rose-600 font-semibold px-2 py-1"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Menyimpan ke Google Sheets...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>{editData ? 'Simpan Perubahan Transaksi' : 'Simpan Transaksi'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}