# 💰 Family Money Tracker (Suami & Istri)

Aplikasi pencatatan dan pelacakan keuangan keluarga kolaboratif yang modern, transparan, dan terintegrasi otomatis dengan **Google Sheets** sebagai database serta **Google Drive** sebagai arsip foto struk transaksi.

![Tech Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Vite%20%7C%20TailwindCSS-indigo)
![Deployment](https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel)
![Database](https://img.shields.io/badge/Database-Google%20Sheets-success?logo=googlesheets)

---

## ✨ Fitur Utama

1. **Dashboard Arus Kas & Anggaran**
   - Ringkasan total kekayaan bersih (*Net Worth*) dari seluruh kantong.
   - Pemasukan, pengeluaran, batas anggaran bulanan, serta visualisasi bento grid interaktif.
2. **Multi-Kantong Saldo & Rekening**
   - Mendukung berbagai jenis kantong: Rekening Bank, E-Wallet, Kas Tunai, dan Pos Alokasi Virtual.
   - Pencatatan mutasi/transfer antar kantong otomatis.
3. **Pencatatan Transaksi Cepat & Lampiran Struk**
   - Input instan (*Optimistic UI*) untuk Pemasukan, Pengeluaran, dan Transfer.
   - Upload foto bukti transfer/struk belanja yang otomatis dikompresi dan diarsipkan ke Google Drive.
4. **Pelacakan Tagihan, Cicilan & Piutang (Debts & Bills)**
   - Mendukung 3 jenis: Tagihan Rutin Bulanan (Wifi, Listrik, PDAM), Cicilan/Hutang Pinjaman, dan Piutang orang lain.
   - Fitur bayar cicilan/tagihan yang otomatis memotong saldo kantong dan mengupdate sisa tagihan.
5. **Laporan & Rekap Summary Keuangan**
   - Analisis periode Bulanan atau Rentang Tanggal Kustom.
   - Breakdown pengeluaran per kategori, arus kas per kantong, serta perbandingan kontribusi Suami vs Istri.
   - Fitur **Cetak / Unduh PDF Siap Cetak (A4)** dan **Ekspor CSV/Excel**.
6. **Mobile-First & Responsif Penuh**
   - Desain bilah navigasi bawah simetris dengan menu *Lainnya* (*bottom sheet*).
   - Dialog konfirmasi hapus kustom yang aman dan modal berlatar belakang *frosted glass blur*.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React Icons
- **Backend / API**: Google Apps Script (Serverless Web App)
- **Database**: Google Sheets Spreadsheet
- **Penyimpanan Media**: Google Drive
- **Hosting**: Vercel

---

## 🚀 Panduan Memulai Cepat (Lokal)

### 1. Prasyarat
- Node.js versi 18 atau lebih baru.
- Akun Google (untuk Google Sheets & Drive).

### 2. Instalasi & Menjalankan
```bash
# Clone repository
git clone https://github.com/USERNAME/family-money-tracker.git
cd family-money-tracker

# Install dependencies
npm install

# Buat file konfigurasi environment
cp .env.example .env
# Isi VITE_GAS_API_URL di file .env dengan URL Web App Apps Script Anda

# Jalankan development server
npm run dev
```

Buka browser di `http://localhost:5173`.

---

## 🌐 Panduan Deployment Online

Untuk mengonlinekan aplikasi ini ke internet secara gratis menggunakan **Vercel** dan **GitHub**, silakan baca panduan lengkap langkah demi langkah di:
👉 **[DEPLOYMENT.md](./DEPLOYMENT.md)**

---

## 📁 Struktur Direktori

```
family-money-tracker/
├── gas-backend/
│   ├── Code.gs             # Backend script Google Apps Script (Spreadsheet & Drive API)
│   └── jsconfig.json       # Konfigurasi type definition Google Apps Script
├── public/                 # Static assets & favicons
├── src/
│   ├── assets/             # Gambar & ikon
│   ├── components/         # Komponen React (Dashboard, Navbar, Reports, Debts, dsb.)
│   │   ├── CategoriesView.jsx
│   │   ├── ConfirmModal.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DebtsView.jsx
│   │   ├── HistoryView.jsx
│   │   ├── Navbar.jsx
│   │   ├── QuickInputModal.jsx
│   │   ├── ReportsView.jsx
│   │   ├── Toast.jsx
│   │   └── WalletsView.jsx
│   ├── services/
│   │   └── api.js          # Client HTTP fetch ke Google Apps Script
│   ├── utils/
│   │   └── formatters.js   # Formatter Rupiah, tanggal Indo, helper
│   ├── App.jsx             # Root application & state management
│   ├── index.css           # Tailwind CSS & Print layout styles
│   └── main.jsx
├── .env.example            # Contoh konfigurasi environment variable
├── DEPLOYMENT.md           # Panduan lengkap deployment ke Vercel & GitHub
├── vercel.json             # Konfigurasi rewrite SPA Vercel
├── package.json
└── vite.config.js
```

---

## 🔒 Privasi & Keamanan

Data keuangan Anda tersimpan sepenuhnya di akun Google Drive & Google Spreadsheet pribadi milik keluarga Anda sendiri tanpa ketergantungan pada server database pihak ketiga.
