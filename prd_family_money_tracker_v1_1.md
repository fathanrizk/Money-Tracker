# PRODUCT REQUIREMENTS DOCUMENT (PRD) - v1.1

**Sistem Pelacakan Arus Kas Multi-Kantong & Dokumentasi Struk Rumah Tangga**

| Atribut Proyek            | Detail Spesifikasi                                                                   |
| :------------------------ | :----------------------------------------------------------------------------------- |
| **Nama Proyek**           | Family Money Tracker (Aplikasi Pelacak Keuangan Keluarga)                            |
| **Target Pengguna**       | Pribadi / Kolaboratif Pasangan (Suami & Istri)                                       |
| **Platform & Distribusi** | Web App Responsif (Mobile-First, mendukung instalasi PWA di layar HP)                |
| **Arsitektur Sistem**     | ReactJS (Vite + TailwindCSS) + Google Apps Script API + Google Sheets + Google Drive |
| **Status Dokumen**        | **FINAL ACC (v1.1)** — Siap Eksekusi Desain UI/UX (Google Stitch) & Pengembangan     |

---

## 1. Visi, Tujuan & Latar Belakang Produk

Membangun aplikasi pencatatan keuangan rumah tangga yang ringan, cepat, dan transparan bagi pasangan (Suami dan Istri). Berbeda dengan pencatat keuangan konvensional yang hanya menjumlahkan uang masuk dan keluar secara tunggal, sistem ini dirancang dengan konsep **Multi-Wallet / Multi-Account Tracking (Saldo Bergerak)**.

Setiap rupiah yang tercatat wajib memiliki kejelasan asal-usul kategori, masuk atau keluar dari pos kantong saldo mana (Rekening Bank Utama, Tabungan, atau Pos Alokasi Uang Jajan), mendukung perpindahan saldo antar kantong (_Mutasi/Transfer_) tanpa merusak laporan pengeluaran bulanan, serta terintegrasi langsung dengan **Google Drive** untuk pengarsipan foto bukti transaksi.

---

## 2. Arsitektur Teknis (Serverless Hybrid Ecosystem)

Sistem dibangun menggunakan pendekatan **Serverless Hybrid** (100% gratis dan terintegrasi dalam satu ekosistem Google):

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

- **Frontend:** ReactJS (Vite) + TailwindCSS + Lucide Icons (dikembangkan menggunakan _code editor_ Antigravity).
- **Kompresi Gambar (Frontend):** HTML5 Canvas / `browser-image-compression` untuk mengecilkan ukuran foto struk sebelum dikirim ke server agar proses simpan cepat (1–2 detik).
- **Backend API:** Google Apps Script (GAS) yang di-_deploy_ sebagai Web App (`doGet` & `doPost`).
- **Database Tabel:** Google Sheets (3 Sheet utama: `Wallets`, `Categories`, `Transactions`).
- **Penyimpanan File (Storage):** **Google Drive** (1 Folder khusus untuk menyimpan seluruh foto struk belanja, kuitansi, atau _screenshot_ bukti transfer).
- **State & Identitas Lokal:** `localStorage` pada browser untuk menyimpan preferensi _Toggle Actor_ (`Suami` / `Istri`) secara otomatis di perangkat masing-masing.

---

## 3. Spesifikasi Modul & Fitur Fungsional

### Modul 1: Dashboard Utama (_Home Screen_)

1.  **Header & Toggle Identitas Cepat:** Sapaan singkat dan _pill toggle_ aktif (`[ 👨 Suami ]` / `[ 👩 Istri ]`) di pojok atas yang tersimpan otomatis di `localStorage` HP.
2.  **Total Kekayaan Bersih (_Total Net Worth_):** Akumulasi seluruh saldo aktif dari semua kantong, dilengkapi tombol ikon mata (_privacy show/hide_).
3.  **Karusel Kartu Kantong Saldo (_Wallet Cards Carousel_):** Deretan kartu (_horizontal scroll_) berisi nama kantong (Bank A, Bank B, Uang Jajan), tipe kantong, dan sisa saldo terkini.
4.  **Ringkasan Arus Kas Bulanan (_Monthly Cashflow_):** Perbandingan **Total Pemasukan** vs **Total Pengeluaran** bulan berjalan (mengabaikan transaksi Mutasi/Transfer agar angka akurat).
5.  **Visualisasi Pengeluaran (_Category Breakdown_):** Grafik lingkaran (_Donut Chart_) atau _progress bar_ kategori pengeluaran terbesar.
6.  **Riwayat Transaksi Terkini (_Recent Transactions_):** Menampilkan 10 transaksi terakhir lengkap dengan nominal, kategori, kantong, label pelaku (`Suami`/`Istri`), serta **indikator ikon lampiran (`📎` / `🖼️`)** jika memiliki foto bukti/struk.

### Modul 2: Pencatatan Cepat (_Quick Input Modal_)

Diakses melalui tombol `+` (_Floating Action Button_) di bagian bawah layar. Memiliki 3 tab jenis transaksi:

1.  **Tab Saldo Masuk (`INCOME`):** Input Nominal $\rightarrow$ Pilih Kategori Asal (Gaji Pokok, Honor A, Pemberian, dll.) $\rightarrow$ Pilih Masuk ke Kantong Mana (`to_wallet_id`).
2.  **Tab Saldo Keluar (`EXPENSE`):** Input Nominal $\rightarrow$ Pilih Diambil dari Kantong Mana (`from_wallet_id`) $\rightarrow$ Pilih Kategori Pengeluaran.
3.  **Tab Mutasi / Pindah Saldo (`TRANSFER`):** Input Nominal $\rightarrow$ Pilih Dari Kantong Asal (`from_wallet_id`) $\rightarrow$ Pilih Ke Kantong Tujuan (`to_wallet_id`). _(Validasi: Kantong asal dan tujuan tidak boleh sama)_.
4.  **Atribut Umum (Tersedia di Ketiga Tab):**
    - **Toggle Pelaku:** `[ 👨 Suami ]` / `[ 👩 Istri ]` (otomatis terisi sesuai memori HP).
    - **Tanggal & Catatan Singkat.**
    - **📸 Upload Bukti Transaksi (Opsional):** Tombol area _dropzone_ / kamera untuk memotret struk belanja kasir secara langsung atau memilih _screenshot_ m-Banking dari galeri, lengkap dengan _preview_ gambar mini sebelum disimpan.

### Modul 3: Pengaturan Dinamis (_Settings Screen_)

1.  **Manajemen Kantong (_Wallets_):** Tambah/Edit kantong baru, tipe kantong (_Bank, E-Wallet, Tunai, Pos Virtual_), saldo awal, dan warna tema kartu.
2.  **Manajemen Kategori (_Categories_):** Tambah/Edit daftar kategori Pemasukan (`INCOME`) maupun Pengeluaran (`EXPENSE`) secara mandiri dari aplikasi tanpa perlu membuka Google Sheets.

### Modul 4: Riwayat, Filter & Peninjau Bukti (_History & Receipt Viewer_)

1.  **Multi-Filter:** Saring riwayat berdasarkan **Bulan/Tahun**, **Kantong Saldo** tertentu, dan **Pelaku** (`Semua`, `Suami`, `Istri`).
2.  **Receipt Lightbox Modal:** Klik ikon lampiran `📎` pada item transaksi untuk melihat _pop-up_ foto struk secara penuh beserta tombol _"Buka File Asli di Google Drive"_.
3.  **Koreksi Data:** Hapus baris transaksi jika salah input (saldo kantong otomatis terkoreksi kembali) sekaligus memindahkan file struk terkait ke tempat sampah Google Drive.

---

## 4. Mekanisme Penyimpanan Bukti Transaksi & Catatan Teknis

### A. Alur Kompresi & Upload ke Google Drive

1.  **Kompresi Sisi Klien (ReactJS):** Saat pengguna memotret struk belanja atau memilih _screenshot_ m-Banking (ukuran awal 3–8 MB), aplikasi secara otomatis mengecilkan resolusi dan ukuran file menggunakan HTML5 Canvas menjadi sekitar **100–200 KB** agar pengiriman data sangat cepat (1–2 detik) dan hemat ruang Google Drive.
2.  **Pengiriman Payload Base64:** Gambar yang telah dikompresi dikonversi menjadi string _Base64_ dan dikirim bersama data transaksi melalui `fetch()` POST ke URL Google Apps Script.
3.  **Penyimpanan & Penautan Otomatis (GAS):** Script `Code.gs` mendekode Base64 menjadi file gambar di dalam folder khusus Google Drive (`Bukti_Transaksi_Keluarga`), lalu menyimpan URL gambar ke kolom `receipt_url` dan ID file ke kolom `receipt_file_id` pada Google Sheets.

### B. Solusi Bebas Error CORS & Tanpa Login Rumit

> **💡 Catatan Arsitektur Senior Developer:**
>
> 1. **CORS-Safe Fetch:** Komunikasi POST dari ReactJS ke Google Apps Script menggunakan header `Content-Type: text/plain;charset=utf-8` dengan _body_ berupa string JSON. Teknik ini mencegah pemblokiran _preflight OPTIONS_ oleh browser namun tetap dapat dibaca sempurna melalui `JSON.parse(e.postData.contents)` di sisi GAS.
> 2. **Identitas Tanpa Login:** Preferensi tombol `[ 👨 Suami ]` atau `[ 👩 Istri ]` disimpan di `localStorage` perangkat masing-masing sehingga pengguna tidak perlu memilih ulang setiap kali membuka aplikasi.

---

## 5. Skema Database (Google Sheets) & Rumus Logika Saldo

### A. Struktur Tabel (3 Sheet Utama)

| Nama Sheet                                   | Daftar Kolom (Header Baris 1)                                                                                                                     | Keterangan & Aturan Data                                                                                                   |
| :------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------- |
| **1. `Wallets`**<br>_(Master Kantong)_       | `id`, `name`, `type`, `initial_balance`, `color`, `is_active`                                                                                     | Menyimpan daftar rekening bank, dompet tunai, maupun pos alokasi virtual (misal: Saldo Uang Jajan).                        |
| **2. `Categories`**<br>_(Master Kategori)_   | `id`, `name`, `type`, `icon`                                                                                                                      | Kolom `type` berisi `INCOME` (Gaji, Honor A, Pemberian) atau `EXPENSE` (Makan, Tagihan, Dapur).                            |
| **3. `Transactions`**<br>_(Jurnal Arus Kas)_ | `id`, `date`, `type`, `amount`, `category_id`, `from_wallet_id`, `to_wallet_id`, `actor`, `notes`, `receipt_url`, `receipt_file_id`, `created_at` | • `INCOME`: isi `to_wallet_id`<br>• `EXPENSE`: isi `from_wallet_id`<br>• `TRANSFER`: isi `from_wallet_id` & `to_wallet_id` |

### B. Rumus Perhitungan Saldo Bergerak (_Dynamic Balance Formula_)

Untuk menjamin keakuratan data 100% tanpa selisih saat ada penghapusan/pengeditan transaksi, saldo setiap kantong ($W$) dihitung secara _real-time_ dengan rumus:

$$\text{Saldo Akhir}(W) = \text{Saldo Awal}(W) + \sum \text{Income}_{\text{ke } W} - \sum \text{Expense}_{\text{dari } W} + \sum \text{Transfer}_{\text{masuk ke } W} - \sum \text{Transfer}_{\text{keluar dari } W}$$

---

## 6. Struktur Folder Proyek & Pedoman UI/UX

### A. Struktur Folder di Code Editor (Antigravity)

```text
family-money-tracker/
├── gas-backend/
│   └── Code.gs           # Script API Google Sheets & Google Drive
├── src/
│   ├── services/
│   │   └── api.js        # Jembatan fetch() CORS-safe & kompresi gambar
│   ├── components/
│   │   ├── Dashboard.jsx # Net worth, Wallet cards carousel & Grafik
│   │   ├── QuickInput.jsx# Form 3 Tab + Upload Struk Kamera/Galeri
│   │   ├── History.jsx   # Multi-Filter & Modal Lightbox Struk
│   │   └── Settings.jsx  # CRUD Kantong & Kategori Dinamis
│   ├── App.jsx
│   └── main.jsx
├── .env                  # Menyimpan VITE_GAS_API_URL
└── PRD.md                # Dokumen spesifikasi ini
```

### B. Sistem Warna Semantik (Pedoman Google Stitch)

- 🟢 **Emerald Green (`#10B981`):** Indikator Saldo Masuk (`INCOME`), pertumbuhan saldo positif, dan _badge_ penerimaan dana.
- 🔴 **Rose Coral (`#F43F5E`):** Indikator Saldo Keluar (`EXPENSE`), pemotongan saldo kantong, dan peringatan pengeluaran.
- 🔵 **Indigo Blue (`#4F46E5`):** Indikator Mutasi / Pindah Saldo (`TRANSFER` antar kantong) dan penanda lampiran struk Google Drive.
