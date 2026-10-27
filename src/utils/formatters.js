// Format angka ke Rupiah (contoh: Rp 1.500.000)
export const formatRupiah = (number) => {
  const num = Number(number) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Format tanggal ke tampilan ramah (contoh: 19 Okt 2026)
export const formatDateIndo = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

// Ambil format YYYY-MM-DD hari ini untuk nilai default input tanggal (menggunakan waktu lokal perangkat)
export const getTodayISO = () => {
  const today = new Date();
  const yr = today.getFullYear();
  const mo = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
};

// Ambil periode bulan ini (format: YYYY-MM) berdasarkan tanggal lokal
export const getCurrentPeriod = () => {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  return `${yr}-${mo}`;
};

// Konversi periode dari berbagai format (ISO date string UTC dari Google Sheets, teks YYYY-MM, dsb) ke format standar "YYYY-MM"
export const getPeriodString = (periodVal) => {
  if (!periodVal) return '';
  const str = String(periodVal).trim();
  if (/^\d{4}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    // Tambahkan offset 7 jam (WIB) jika string berasal dari serialisasi Google Sheets midnight WIB (contoh: 2026-09-30T17:00:00.000Z)
    const wibDate = new Date(d.getTime() + 7 * 3600 * 1000);
    const yr = wibDate.getUTCFullYear();
    const mo = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
    return `${yr}-${mo}`;
  }
  return str.substring(0, 7);
};