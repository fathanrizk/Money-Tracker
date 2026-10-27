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

// Ambil format YYYY-MM-DD hari ini untuk nilai default input tanggal
export const getTodayISO = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};