# PRODUCT REQUIREMENTS DOCUMENT (PRD) - v1.2

**Sistem Pelacakan Arus Kas Multi-Kantong & Dokumentasi Struk Rumah Tangga**

| Atribut Proyek            | Detail Spesifikasi                                                                                                 |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| **Nama Proyek**           | Family Money Tracker (Aplikasi Pelacak Keuangan Keluarga)                                                          |
| **Target Pengguna**       | Pribadi / Kolaboratif Pasangan (Suami & Istri)                                                                     |
| **Platform & Distribusi** | Web App Responsif (Mobile-First PWA & Desktop Bento-Grid Dashboard)                                                |
| **Arsitektur Sistem**     | ReactJS (Vite + TailwindCSS) + Google Apps Script API + Google Sheets + Google Drive                               |
| **Status Dokumen**        | **FINAL ACC (v1.2)** — Pemetaan Navigasi Simetris 5 Kolom (`Beranda`, `Riwayat`, `+ Catat`, `Kantong`, `Kategori`) |

---

## 1. Visi, Tujuan & Latar Belakang Produk

Membangun aplikasi pencatatan keuangan rumah tangga yang ringan, cepat, dan transparan bagi pasangan (Suami dan Istri)[cite: 1]. Berbeda dengan pencatat keuangan konvensional yang hanya menjumlahkan uang masuk dan keluar secara tunggal, sistem ini dirancang dengan konsep **Multi-Wallet / Multi-Account Tracking (Saldo Bergerak)**[cite: 1].

Setiap rupiah yang tercatat wajib memiliki kejelasan asal-usul kategori, masuk atau keluar dari pos kantong saldo mana (Rekening Bank Utama, Tabungan, atau Pos Alokasi Uang Jajan), mendukung perpindahan saldo antar kantong (_Mutasi/Transfer_) tanpa merusak laporan pengeluaran bulanan, serta terintegrasi langsung dengan **Google Drive** untuk pengarsipan foto bukti transaksi[cite: 1].

---

## 2. Arsitektur Teknis (Serverless Hybrid Ecosystem)

Sistem dibangun menggunakan pendekatan **Serverless Hybrid** (100% gratis dan terintegrasi dalam satu ekosistem Google)[cite: 1]:

```text
+-----------------------+                      +------------------------+
|     Frontend PWA      |   fetch() POST/GET   |   Google Apps Script   |
|  ReactJS + Tailwind   | -------------------> |  Web App API (Code.gs) |
| (Kompresi Foto & UI)  |  text/plain (CORS)   |   doGet() & doPost()   |
+-----------------------+                      +-----------+------------+
                                                           |
                                     +---------------------+---------------------+
                                     |                                           |
                                     v                                           v
                     +-------------------------------+           +-------------------------------+
                     |    Google Sheets Database     |           |     Google Drive Storage      |
                     | Wallets • Categories • Trans. |           |  Arsip Foto Struk & Bukti TF  |
                     +-------------------------------+           +-------------------------------+
```

- **Frontend:** ReactJS (Vite) + TailwindCSS + Lucide Icons (dikembangkan menggunakan _code editor_ Antigravity)[cite: 1].
- **Kompresi Gambar (Frontend):** HTML5 Canvas untuk mengecilkan ukuran foto struk sebelum dikirim ke server agar proses simpan cepat (1–2 detik)[cite: 1].
- **Backend API:** Google Apps Script (GAS) yang di-_deploy_ sebagai Web App (`doGet` & `doPost`)[cite: 1].
- **Database Tabel:** Google Sheets (3 Sheet utama: `Wallets`, `Categories`, `Transactions`)[cite: 1].
- **Penyimpanan File (Storage):** **Google Drive** (1 Folder khusus untuk menyimpan seluruh foto struk belanja, kuitansi, atau _screenshot_ bukti transfer)[cite: 1].
- **State & Identitas Lokal:** `localStorage` pada browser untuk menyimpan preferensi _Toggle Actor_ (`Suami` / `Istri`) secara otomatis di perangkat masing-masing[cite: 1].

---

## 3. Arsitektur Navigasi & Pemetaan Modul (5 Menu Simetris)

Untuk menjamin ergonomi layar sentuh pada perangkat _Mobile_ (PWA) sekaligus kerapian pada layar _Desktop_, sistem navigasi dirancang dengan struktur **5 Titik Akses Simetris**:

- **Tampilan Mobile (Bottom Navigation Bar - 5 Kolom):**
  `[ 1. Beranda ]` | `[ 2. Riwayat ]` | **`[ ➕ Catat (FAB Tengah) ]`** | `[ 3. Kantong ]` | `[ 4. Kategori ]`
- **Tampilan Desktop (Fixed Left Sidebar):**
  Tombol Utama `+ Catat Transaksi` di bagian atas, diikuti 4 menu halaman (`Beranda`, `Riwayat`, `Kantong`, `Kategori`), serta kartu indikator status sinkronisasi Google Cloud di bagian bawah.

---

### Menu 1: Beranda (`Dashboard.jsx` — `id: 'dashboard'`)

Halaman ringkasan eksekutif untuk memantau kondisi kesehatan finansial keluarga dalam satu tatapan:

1. **Header & Toggle Identitas Cepat:** Sapaan singkat, tombol _Refresh_ sinkronisasi data, dan _pill toggle_ aktif (`[ 👨 Suami ]` / `[ 👩 Istri ]`) di pojok atas yang tersimpan otomatis di `localStorage` HP[cite: 1].
2. **Hero Total Kekayaan Bersih (_Total Net Worth_):** Akumulasi seluruh saldo aktif dari semua kantong, dilengkapi tombol ikon mata (_privacy show/hide_) dan indikator _Surplus/Defisit_ bulan berjalan[cite: 1].
3. **Deretan Kartu Kantong Saldo (_Wallet Cards_):** Karusel geser samping (_horizontal swipe_) di Mobile atau _Grid_ 3 kolom di Desktop berisi nama kantong, tipe kantong, dan sisa saldo terkini, disertai pintasan `+ Kelola Kantong` menuju Menu Kantong[cite: 1].
4. **Ringkasan Arus Kas & Batas Anggaran Bulanan (_Monthly Cashflow & Budget_):** Kotak perbandingan **Total Saldo Masuk** vs **Total Saldo Keluar** bulan berjalan (mengabaikan transaksi Mutasi/Transfer agar angka akurat)[cite: 1], dilengkapi _progress bar_ Batas Anggaran Keluarga.
5. **Visualisasi Proporsi Pengeluaran (_Category Breakdown_):** Daftar persentase & _progress bar_ 4 kategori pengeluaran terbesar bulan ini[cite: 1].
6. **Transaksi Terkini (_Recent Transactions_):** Menampilkan 6 transaksi terakhir lengkap dengan nominal, kategori, kantong asal/tujuan, label pelaku (`Suami`/`Istri`), tombol `📎 Lihat Struk` (jika ada bukti foto), serta pintasan menuju Menu Riwayat[cite: 1].

---

### Menu 2: Riwayat (`HistoryView.jsx` — `id: 'history'`)

Halaman khusus audit, pencarian, dan penyaringan seluruh jurnal transaksi[cite: 1]:

1. **Pencarian Kata Kunci (_Search Bar_):** Mencari transaksi berdasarkan nama kategori atau isi catatan (misal: _"Kopi"_, _"Listrik"_, _"Honor"_).
2. **Multi-Filter Bar:**
   - Filter berdasarkan **Tipe Transaksi** (`Semua`, `Saldo Masuk`, `Saldo Keluar`, `Mutasi Saldo`).
   - Filter berdasarkan **Kantong Saldo** (`Semua Kantong` atau spesifik per kantong seperti _Bank A_, _Uang Jajan_, dll.)[cite: 1].
   - Filter berdasarkan **Pelaku** (`Suami & Istri`, `👨 Khusus Suami`, `👩 Khusus Istri`)[cite: 1].
3. **Daftar Jurnal & Koreksi Data:** Menampilkan daftar lengkap hasil saringan beserta tombol **Hapus Transaksi** (`Trash Icon`) yang secara otomatis mengembalikan/mengoreksi perhitungan saldo kantong terkait dan membuang file struk di Google Drive ke tempat sampah[cite: 1].
4. **Receipt Lightbox Modal:** Klik badge `📎 Lihat Struk` pada item transaksi untuk membuka _pop-up_ pratinjau foto struk resolusi penuh beserta tombol _"Buka File Asli di Google Drive"_[cite: 1].

---

### Aksi Tengah: `+ Catat` (`QuickInputModal.jsx` — Floating Action / Modal)

Diakses kapan saja dari halaman mana pun melalui tombol tengah `+ Catat` di navigasi bawah (Mobile) atau tombol atas Sidebar (Desktop)[cite: 1]. Memiliki 3 tab jenis transaksi[cite: 1]:

1. **Tab `+ Saldo Masuk` (`INCOME`):** Input Nominal $\rightarrow$ Pilih Asal Pemasukan / Kategori (`Gaji Pokok`, `Honor Proyek`, `Pemberian`, dll.) $\rightarrow$ Pilih Masuk ke Kantong Mana (`to_wallet_id`)[cite: 1].
2. **Tab `- Saldo Keluar` (`EXPENSE`):** Input Nominal $\rightarrow$ Pilih Diambil dari Kantong Mana (`from_wallet_id`) $\rightarrow$ Pilih Untuk Keperluan / Kategori Pengeluaran[cite: 1].
3. **Tab `⇄ Mutasi Saldo` (`TRANSFER`):** Input Nominal $\rightarrow$ Pilih Dari Kantong Asal (`from_wallet_id`) $\rightarrow$ Pilih Ke Kantong Tujuan (`to_wallet_id`)[cite: 1]. _(Validasi sistem: Kantong asal dan tujuan tidak boleh sama)_[cite: 1].
4. **Atribut Umum (Tersedia di Ketiga Tab):**
   - **Toggle Pelaku:** `[ 👨 Suami ]` / `[ 👩 Istri ]` (otomatis terisi sesuai memori HP)[cite: 1].
   - **Input Tanggal & Catatan Singkat**[cite: 1].
   - **📸 Upload Bukti Struk / Transfer (Opsional):** Kotak _dropzone_ kamera/galeri yang mengompresi foto secara otomatis sebelum diunggah ke Google Drive, lengkap dengan _preview_ gambar mini[cite: 1].

---

### Menu 3: Kantong (`WalletsView.jsx` / `SettingsView` — `id: 'wallets'`)

Halaman dedikasi untuk mengelola seluruh tempat penyimpanan uang (fisik maupun virtual) agar leluasa dipantau[cite: 1]:

1. **Form Tambah Kantong Baru:** Input Nama Kantong (misal: _Bank Mandiri, Dompet Tunai, Saldo Uang Jajan_), pilih Tipe Kantong (`Rekening Bank`, `Pos Alokasi Virtual`, `E-Wallet`, `Kas Tunai`), input **Saldo Awal (`initial_balance`)**, dan pilih **Tema Warna Kartu** (`Biru`, `Hijau`, `Oranye`, `Ungu Indigo`, `Merah Rose`)[cite: 1].
2. **Katalog & Rincian Kantong Aktif:** Menampilkan kartu-kartu kantong dengan rincian:
   - Saldo Awal saat kantong dibuat[cite: 1].
   - Total Akumulasi Masuk & Keluar pada kantong tersebut.
   - **Saldo Saat Ini (`current_balance`)** yang bergerak dinamis[cite: 1].

---

### Menu 4: Kategori (`CategoriesView.jsx` / `SettingsView` — `id: 'categories'`)

Halaman dedikasi untuk mengelola master data sumber pemasukan dan pos pengeluaran secara mandiri tanpa perlu membuka Google Sheets[cite: 1]:

1. **Form Tambah Kategori Baru:** Input Nama Kategori (misal: _Honor B, Bonus, Belanja Bulanan, Kuota Internet_) dan pilih Kelompok Kategori (`Kategori Saldo Masuk / INCOME` atau `Kategori Saldo Keluar / EXPENSE`)[cite: 1].
2. **Daftar Master Kategori Terpisah:**
   - **Kolom Kiri / Atas (🟢 Asal Saldo Masuk - `INCOME`):** Menampilkan seluruh daftar sumber pemasukan aktif[cite: 1].
   - **Kolom Kanan / Bawah (🔴 Pos Saldo Keluar - `EXPENSE`):** Menampilkan seluruh daftar pos pengeluaran aktif[cite: 1].

---

## 4. Mekanisme Penyimpanan Bukti Transaksi & Catatan Teknis

### A. Alur Kompresi & Upload ke Google Drive

1. **Kompresi Sisi Klien (ReactJS):** Saat pengguna memotret struk belanja atau memilih _screenshot_ m-Banking (ukuran awal 3–8 MB), fungsi `compressImageToBase64()` secara otomatis mengecilkan resolusi (maks lebar `1000px`, kualitas `0.7`) menggunakan HTML5 Canvas menjadi sekitar **100–200 KB** agar pengiriman data sangat cepat (1–2 detik) dan hemat ruang Google Drive[cite: 1].
2. **Pengiriman Payload Base64:** Gambar yang telah dikompresi dikonversi menjadi string _Base64_ dan dikirim bersama data transaksi melalui `fetch()` POST ke URL Google Apps Script[cite: 1].
3. **Penyimpanan & Penautan Otomatis (GAS):** Script `Code.gs` mendekode Base64 menjadi file gambar di dalam folder khusus Google Drive (`Bukti_Transaksi_Keluarga`), mengatur izin lihat via tautan, lalu menyimpan URL thumbnail resolusi tinggi ke kolom `receipt_url` dan ID file ke kolom `receipt_file_id` pada Google Sheets[cite: 1].

### B. Solusi Bebas Error CORS & Tanpa Login Rumit

1. **CORS-Safe Fetch:** Komunikasi POST dari ReactJS ke Google Apps Script menggunakan header `Content-Type: text/plain;charset=utf-8` dengan _body_ berupa string JSON[cite: 1]. Teknik ini mencegah pemblokiran _preflight OPTIONS_ oleh browser namun tetap dapat dibaca sempurna melalui `JSON.parse(e.postData.contents)` di sisi GAS[cite: 1].
2. **Identitas Tanpa Login:** Preferensi tombol `[ 👨 Suami ]` atau `[ 👩 Istri ]` disimpan di `localStorage` (`fmt_actor`) perangkat masing-masing sehingga pengguna tidak perlu memilih ulang setiap kali membuka aplikasi[cite: 1].

---

## 5. Skema Database (Google Sheets) & Rumus Logika Saldo

### A. Struktur Tabel (4 Sheet Utama)

| Nama Sheet                                   | Daftar Kolom (Header Baris 1)                                                                                                                     | Keterangan & Aturan Data                                                                                                            |
| :------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------- |
| **1. `Wallets`**<br>_(Master Kantong)_       | `id`, `name`, `type`, `initial_balance`, `color`, `is_active`                                                                                     | Menyimpan daftar rekening bank, dompet tunai, maupun pos alokasi virtual (misal: Saldo Uang Jajan)[cite: 1].                        |
| **2. `Categories`**<br>_(Master Kategori)_   | `id`, `name`, `type`, `icon`                                                                                                                      | Kolom `type` berisi `INCOME` (Gaji, Honor A, Pemberian) atau `EXPENSE` (Makan, Tagihan, Dapur)[cite: 1].                            |
| **3. `Transactions`**<br>_(Jurnal Arus Kas)_ | `id`, `date`, `type`, `amount`, `category_id`, `from_wallet_id`, `to_wallet_id`, `actor`, `notes`, `receipt_url`, `receipt_file_id`, `created_at` | • `INCOME`: isi `to_wallet_id`<br>• `EXPENSE`: isi `from_wallet_id`<br>• `TRANSFER`: isi `from_wallet_id` & `to_wallet_id`[cite: 1] |
| **4. `Debts`**<br>_(Tagihan & Hutang)_       | `id`, `title`, `type`, `category_id`, `total_amount`, `installment_amount`, `remaining_amount`, `due_day`, `last_paid_at`, `last_paid_period`, `actor`, `notes`, `is_active`, `created_at` | • `BILL`: Tagihan Rutin Bulanan<br>• `DEBT_PAYABLE`: Hutang/Cicilan Pinjaman<br>• `DEBT_RECEIVABLE`: Piutang Uang ke Orang Lain |

### B. Rumus Perhitungan Saldo Bergerak (_Dynamic Balance Formula_)

Untuk menjamin keakuratan data 100% tanpa selisih saat ada penghapusan/pengeditan transaksi, saldo setiap kantong ($W$) dihitung secara _real-time_ dengan rumus[cite: 1]:

$$\text{Saldo Akhir}(W) = \text{Saldo Awal}(W) + \sum \text{Income}_{\text{ke } W} - \sum \text{Expense}_{\text{dari } W} + \sum \text{Transfer}_{\text{masuk ke } W} - \sum \text{Transfer}_{\text{keluar dari } W}$$

---

## 6. Struktur Folder Proyek & Pedoman UI/UX

### A. Struktur Folder di Code Editor (Antigravity)

```text
family-money-tracker/
├── gas-backend/
│   └── Code.gs                  # Script API Google Sheets & Google Drive (v1.3: + Modul Debts)
├── src/
│   ├── services/
│   │   └── api.js               # Jembatan fetch() CORS-safe, kompresi gambar & Debts API
│   ├── components/
│   │   ├── Navbar.jsx           # Navigasi Simetris 5 Kolom (Mobile) & Sidebar (Desktop)
│   │   ├── Dashboard.jsx        # Menu 1: Beranda (+ Bento Widget Tagihan & Cicilan)
│   │   ├── HistoryView.jsx      # Menu 2: Riwayat (Search, Multi-Filter, Lightbox Struk)
│   │   ├── DebtsView.jsx        # Modul Tagihan, Cicilan & Hutang/Piutang
│   │   ├── QuickInputModal.jsx  # Menu Tengah (+): Modal 3 Tab + Upload Struk Drive
│   │   ├── WalletsView.jsx      # Menu 3: Kantong (Kelola & Rincian Kantong Saldo)
│   │   └── CategoriesView.jsx   # Menu 4: Kategori (Kelola Master Kategori Masuk/Keluar)
│   ├── utils/
│   │   └── formatters.js        # Helper Format Rupiah & Tanggal Indonesia
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env                         # Menyimpan VITE_GAS_API_URL
└── prd_family_v2.md             # Dokumen spesifikasi v1.3
```

### B. Sistem Warna Semantik

- 🟢 **Emerald Green (`#10B981`):** Indikator Saldo Masuk (`INCOME`), pertumbuhan saldo positif, dan _badge_ penerimaan dana[cite: 1].
- 🔴 **Rose Coral (`#F43F5E`):** Indikator Saldo Keluar (`EXPENSE`), pemotongan saldo kantong, dan peringatan pengeluaran[cite: 1].
- 🔵 **Indigo Blue (`#4F46E5`):** Indikator Mutasi / Pindah Saldo (`TRANSFER` antar kantong) dan penanda lampiran struk Google Drive[cite: 1].
