import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Tags, Plus, Pencil, Trash2, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function CategoriesView({
  categories,
  //transactions = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) {
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('EXPENSE');
  const [loading, setLoading] = useState(false);

  // State Modal Edit Kategori
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('EXPENSE');
  const [editLoading, setEditLoading] = useState(false);

  // State Modal Konfirmasi Hapus Kategori
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!catName) return;
    setLoading(true);
    try {
      await onAddCategory({ name: catName, type: catType });
      setCatName('');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (c) => {
    setEditingCategory(c);
    setEditName(c.name || '');
    setEditType(c.type || 'EXPENSE');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName || !editingCategory) return;
    setEditLoading(true);
    try {
      await onUpdateCategory({
        id: editingCategory.id,
        name: editName,
        type: editType,
      });
      setEditingCategory(null);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (c) => {
    setCategoryToDelete(c);
  };

  const incomeCategories = categories.filter((c) => c.type === 'INCOME');
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600">
          <Tags className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-base">Master Kategori</h2>
          <p className="text-xs text-slate-500">Kelola sumber pemasukan &amp; pos pengeluaran keluarga (Tambah, Edit, Hapus)</p>
        </div>
      </div>

      {/* Form Tambah Kategori Baru */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <p className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-emerald-600" />
          Tambah Kategori Baru
        </p>
        <form onSubmit={handleCreateCategory} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              required
              placeholder="Nama Kategori (mis: Honor B / Listrik)"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <select
              value={catType}
              onChange={(e) => setCatType(e.target.value)}
              className="p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="EXPENSE">🔴 Kategori Saldo Keluar (Pengeluaran)</option>
              <option value="INCOME">🟢 Kategori Saldo Masuk (Pemasukan)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-bold rounded-xl transition shadow-sm"
          >
            {loading ? 'Menyimpan...' : '+ Simpan Kategori Baru'}
          </button>
        </form>
      </div>

      {/* Daftar Master Kategori: 2 Kolom (INCOME kiri, EXPENSE kanan) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Kolom Kiri / Atas: INCOME */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              🟢 Asal Saldo Masuk — INCOME
            </p>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {incomeCategories.length} kategori
            </span>
          </div>
          {incomeCategories.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Belum ada kategori pemasukan.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {incomeCategories.map((c) => (
                <li
                  key={c.id}
                  className="px-3 py-2 rounded-xl bg-emerald-50/60 border border-emerald-100/60 text-sm font-medium text-slate-800 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-lg transition"
                      title="Edit Kategori"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Kolom Kanan / Bawah: EXPENSE */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              🔴 Pos Saldo Keluar — EXPENSE
            </p>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              {expenseCategories.length} kategori
            </span>
          </div>
          {expenseCategories.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              Belum ada kategori pengeluaran.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {expenseCategories.map((c) => (
                <li
                  key={c.id}
                  className="px-3 py-2 rounded-xl bg-rose-50/60 border border-rose-100/60 text-sm font-medium text-slate-800 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-1 text-slate-400 hover:text-rose-700 hover:bg-white rounded-lg transition"
                      title="Edit Kategori"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* MODAL EDIT KATEGORI */}
      {editingCategory && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingCategory(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl my-auto max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Edit Kategori</h4>
                  <p className="text-xs text-slate-500">Perbarui nama atau jenis arus kategori</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCategory(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Kategori
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="EXPENSE">🔴 Kategori Saldo Keluar (Pengeluaran)</option>
                  <option value="INCOME">🟢 Kategori Saldo Masuk (Pemasukan)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL KONFIRMASI HAPUS KATEGORI */}
      <ConfirmModal
        isOpen={!!categoryToDelete}
        title="Hapus Kategori?"
        message={
          categoryToDelete
            ? `Apakah Anda yakin ingin menghapus kategori "${categoryToDelete.name}"?\nKategori ini tidak akan menghapus transaksi lama di riwayat, namun label kategori pada transaksi tersebut akan menjadi tidak terdefinisi.`
            : ''
        }
        confirmText="Ya, Hapus Kategori"
        onConfirm={() => {
          if (categoryToDelete) {
            onDeleteCategory(categoryToDelete.id);
            setCategoryToDelete(null);
          }
        }}
        onClose={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
