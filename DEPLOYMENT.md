# 🚀 Panduan Deployment: Family Money Tracker ke Vercel

Panduan ini berisi langkah-langkah lengkap untuk mengonlinekan aplikasi **Family Money Tracker** secara gratis menggunakan **GitHub** dan **Vercel**, dengan backend **Google Apps Script** & **Google Sheets**.

---

## 📋 Ringkasan Arsitektur
- **Frontend**: React 19 + Vite + Tailwind CSS (di-host di **Vercel**).
- **Backend**: Google Apps Script (GAS) Web App (di-host di **Google Cloud/Drive**).
- **Database**: Google Sheets (Spreadsheet pribadi keluarga Anda).
- **Storage Struk**: Google Drive (Folder khusus bukti transaksi).

---

## 🛠️ Langkah 1: Buat Repository Baru di GitHub

1. Buka browser dan login ke akun GitHub Anda di [https://github.com](https://github.com).
2. Klik tombol **"+"** di kanan atas, lalu pilih **New repository**.
3. Isi informasi repository:
   - **Repository name**: `family-money-tracker` (atau nama lain pilihan Anda).
   - **Description**: *Aplikasi pencatatan keuangan keluarga kolaboratif Suami & Istri.*
   - **Visibility**: Pilih **Private** (sangat disarankan untuk data pribadi) atau **Public**.
   - **Initialize with**: *JANGAN* centang README, .gitignore, atau license (karena kita sudah membuatnya secara lokal).
4. Klik **Create repository**.
5. Salin URL remote repository Anda, contoh:
   `https://github.com/USERNAME_ANDA/family-money-tracker.git`

---

## 💻 Langkah 2: Hubungkan dan Push Kode Lokal ke GitHub

Buka terminal di folder project (`d:\Fathan\Project\Moneytracker\family-money-tracker`), lalu jalankan perintah berikut secara berurutan:

```bash
# 1. Hubungkan repo lokal dengan GitHub
git remote add origin https://github.com/fathanrizk/Money-Tracker.git

# 2. Pastikan berada di branch main
git branch -M main

# 3. Unggah seluruh kode ke GitHub
git push -u origin main
```

*(Jika diminta login oleh GitHub di terminal atau browser pop-up, silakan lakukan otorisasi).*

---

## 🌐 Langkah 3: Deploy Frontend di Vercel (Gratis & Cepat)

1. Buka [https://vercel.com](https://vercel.com) dan klik **Sign Up** atau **Log In**.
2. Pilih opsi **Continue with GitHub** agar akun Vercel langsung terhubung ke akun GitHub Anda.
3. Di dashboard Vercel, klik tombol **Add New...** di kanan atas, lalu pilih **Project**.
4. Di daftar repository GitHub Anda, cari repository `family-money-tracker`, lalu klik tombol **Import**.
5. Di halaman konfigurasi proyek Vercel:
   - **Framework Preset**: Biarkan terdeteksi otomatis sebagai `Vite`.
   - **Root Directory**: `./` (default).
   - **Build and Output Settings**: Biarkan default (`npm run build` dan output `dist`).
6. Buka bagian **Environment Variables** (SANGAT PENTING):
   - **Key**: `VITE_GAS_API_URL`
   - **Value**: Masukkan URL Web App Google Apps Script Anda, contoh:
     `https://script.google.com/macros/s/AKfycbz81NFY6bu79Jyj66euZWNc76SB7HXlfPA6YlSaN3gchPwvDZ06aPbCZS2T32ZlTELe/exec`
   - Klik tombol **Add**.
7. Klik tombol **Deploy** di bagian bawah.
8. Tunggu proses build selama 30-60 detik.
9. **Selesai! 🎉** Anda akan mendapatkan URL online gratis ber-SSL (HTTPS), contoh:
   `https://family-money-tracker.vercel.app`

---

## ⚙️ Langkah 4: Pastikan Google Apps Script Siap Menerima Akses (CORS)

Agar frontend di Vercel bisa berkomunikasi lancar dengan Google Sheets:
1. Buka file Google Spreadsheet Anda.
2. Di menu atas, klik **Extensions (Ekstensi)** > **Apps Script**.
3. Pastikan seluruh isi kode di tab editor Apps Script sudah sama dengan kode di file lokal `gas-backend/Code.gs`.
4. Klik tombol biru **Deploy** di pojok kanan atas > pilih **New deployment** (atau **Manage deployments** > edit versi baru).
5. Pastikan konfigurasinya:
   - **Select type**: Web app.
   - **Description**: *Production Vercel Deployment*.
   - **Execute as**: **Me (email Anda)**.
   - **Who has access**: **Anyone** *(PENTING: Harus "Anyone" agar browser Anda & pasangan bisa mengirim dan mengambil data tanpa terblokir batasan login Google).*
6. Klik **Deploy**, lalu salin URL Web App yang dihasilkan.
7. Jika URL berubah, jangan lupa update `VITE_GAS_API_URL` di Vercel Dashboard (*Settings* > *Environment Variables*) dan lakukan *Redeploy*.

---

## 🔄 Pembaruan Otomatis (CI/CD)

Kelebihan utama menghubungkan GitHub dengan Vercel:
- Setiap kali Anda atau AI melakukan perbaikan fitur di laptop:
  ```bash
  git add .
  git commit -m "update fitur X"
  git push
  ```
- Vercel akan **secara otomatis** mendeteksi perubahan tersebut, melakukan build ulang di cloud, dan memperbarui website online Anda dalam hitungan detik tanpa perlu setup manual lagi!

---

## 📱 Tips Penggunaan di Smartphone (PWA / Add to Home Screen)

Website ini sudah dioptimalkan penuh untuk mobile:
- Di **Google Chrome (Android)**: Buka URL Vercel Anda > klik titik tiga di kanan atas > pilih **"Tambahkan ke Layar Utama" (Add to Home screen)**.
- Di **Safari (iPhone/iPad)**: Buka URL Vercel Anda > klik tombol **Share** di bawah > pilih **"Add to Home Screen"**.
- Aplikasi akan muncul di layar ponsel seperti aplikasi native tanpa bilah browser!
