# Audit Report: PRD v1.2 vs Implementasi Saat Ini

## Ringkasan Status

| Menu                     | File                  | UI/UX          | Backend/Fungsionalitas | Status          |
| ------------------------ | --------------------- | -------------- | ---------------------- | --------------- |
| Navbar (Mobile 5 kolom)  | `Navbar.jsx`          | ✅ Sudah benar | ✅                     | ✅ SESUAI       |
| Navbar (Desktop Sidebar) | `Navbar.jsx`          | ✅             | ✅                     | ✅ SESUAI       |
| Menu 1: Beranda          | `Dashboard.jsx`       | ✅             | ⚠️ Minor               | ⚠️ MINOR GAP    |
| Menu 2: Riwayat          | `HistoryView.jsx`     | ✅             | ✅                     | ✅ SESUAI       |
| Aksi Tengah: + Catat     | `QuickInputModal.jsx` | ✅             | ✅                     | ✅ SESUAI       |
| Menu 3: Kantong          | `SettingsView.jsx`    | ⚠️             | ⚠️                     | ⚠️ MAJOR GAP    |
| Menu 4: Kategori         | `SettingsView.jsx`    | ✅             | ✅                     | ✅ SESUAI       |
| Routing App              | `App.jsx`             | ❌             | ❌                     | ❌ CRITICAL BUG |

---

## ❌ CRITICAL: Routing di `App.jsx` — Menu Kantong & Kategori Tidak Terhubung

**Masalah paling kritis.** PRD mendefinisikan 4 menu halaman terpisah:

- `id: 'dashboard'` → `Dashboard.jsx`
- `id: 'history'` → `HistoryView.jsx`
- `id: 'wallets'` → `WalletsView.jsx` / SettingsView bagian Kantong
- `id: 'categories'` → `CategoriesView.jsx` / SettingsView bagian Kategori

**Yang terjadi di kode saat ini (`App.jsx`):**

```jsx
// Hanya ada 3 kondisi rendering:
{activeTab === 'dashboard' && <Dashboard ... />}
{activeTab === 'history' && <HistoryView ... />}
{activeTab === 'settings' && <SettingsView ... />}  // ← pakai id 'settings', BUKAN 'wallets' atau 'categories'
```

**Navbar sudah benar** mengirim `setActiveTab('wallets')` dan `setActiveTab('categories')`, tapi di `App.jsx` tidak ada handler untuk `activeTab === 'wallets'` maupun `activeTab === 'categories'`. Artinya **klik menu Kantong dan Kategori di navbar tidak menampilkan halaman apapun** — layar kosong!

**Selain itu**, `Dashboard.jsx` memanggil `onGoToSettings` yang men-set `activeTab('settings')`, padahal seharusnya `activeTab('wallets')`.

---

## ⚠️ Menu 3: Kantong — Tidak Ada File Tersendiri

**PRD menentukan:** `WalletsView.jsx` — halaman dedicated untuk **Kantong saja**

**Yang ada:** `SettingsView.jsx` yang menggabungkan **Kantong + Kategori** dalam satu halaman dengan layout 2 kolom.

**Dampak UI/UX:**

- Di mobile, halaman settings menampilkan dua form sekaligus → terlalu padat
- Navigasi bar mobile punya tombol **Kantong** dan **Kategori** terpisah, tapi keduanya harusnya menuju view yang berbeda

**Yang harus dilakukan:**

1. Pisah `SettingsView.jsx` menjadi `WalletsView.jsx` dan `CategoriesView.jsx`
2. Update routing di `App.jsx`

---

## ⚠️ Menu 1: Beranda — Minor Gap

**Yang sudah benar (✅):**

- Hero Total Net Worth dengan eye toggle ✅
- Wallet Cards carousel mobile / grid desktop ✅
- Arus kas bulanan (income vs expense, exclude TRANSFER) ✅
- Progress bar anggaran bulanan ✅
- Category breakdown 4 terbesar ✅
- Recent transactions (6 terakhir) + badge Lihat Struk ✅
- Link "Kelola Kantong" & "Lihat Semua Riwayat" ✅

**Minor gap (⚠️):**

- Tombol `+ Kelola Kantong` di Dashboard memanggil `onGoToSettings` yang diset ke `activeTab('settings')` — harusnya ke `activeTab('wallets')` sesuai PRD
- Surplus/Defisit badge memakai warna tetap `emerald` meski kondisi defisit — idealnya warna berubah saat defisit

---

## ✅ Menu 2: Riwayat — Sesuai PRD

Semua fitur sudah terpenuhi:

- Search bar ✅
- Filter tipe transaksi (Semua/INCOME/EXPENSE/TRANSFER) ✅
- Filter kantong ✅
- Filter pelaku (Suami & Istri) ✅
- Tombol hapus transaksi (Trash icon) ✅
- Badge "Lihat Struk" + lightbox modal (di App.jsx) ✅

---

## ✅ Aksi Tengah: + Catat — Sesuai PRD

- 3 tab: Saldo Masuk / Saldo Keluar / Mutasi Saldo ✅
- Toggle Pelaku (Suami/Istri) ✅
- Input tanggal & catatan ✅
- Upload foto struk + kompresi + preview ✅
- Validasi kantong asal ≠ tujuan saat Transfer ✅
- Payload lengkap ke API ✅

---

## ✅ Menu 4: Kategori — Sesuai PRD (dalam SettingsView)

- Form tambah kategori (nama + tipe INCOME/EXPENSE) ✅
- Daftar INCOME (kiri/atas) & EXPENSE (kanan/bawah) ✅

---

## ✅ Navbar Mobile 5 Kolom — Sesuai PRD

```
[ Beranda ] [ Riwayat ] [➕ Catat (FAB)] [ Kantong ] [ Kategori ]
```

Layout sudah benar dengan `grid-cols-5`, FAB center `-mt-6`, dan label teks semua 4 menu sudah ada.

---

## ✅ Navbar Desktop Sidebar — Sesuai PRD

- Logo + nama ✅
- Tombol `+ Catat Transaksi` di atas ✅
- 4 menu navigasi (Beranda, Riwayat, Kantong, Kategori) ✅
- Kartu status Google Cloud di bawah ✅

---

## Prioritas Perbaikan

| Prioritas   | Masalah                                                                    | File yang Diubah           |
| ----------- | -------------------------------------------------------------------------- | -------------------------- |
| 🔴 CRITICAL | Routing `wallets` & `categories` tidak ada di App.jsx                      | `App.jsx`                  |
| 🔴 CRITICAL | `onGoToSettings` di Dashboard → harus `onGoToWallets`                      | `App.jsx`, `Dashboard.jsx` |
| 🟠 HIGH     | Pisah `SettingsView.jsx` → `WalletsView.jsx` + `CategoriesView.jsx`        | Buat 2 file baru           |
| 🟡 LOW      | Badge surplus/defisit warnanya statis emerald (tidak berubah saat defisit) | `Dashboard.jsx`            |
