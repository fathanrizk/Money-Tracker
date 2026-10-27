const API_URL = import.meta.env.VITE_GAS_API_URL;

/**
 * Mengambil seluruh data (Wallets, Categories, Transactions) dari Google Sheets
 */
export const fetchAppData = async () => {
  if (!API_URL || API_URL.includes("URL_WEB_APP_ANDA")) {
    throw new Error("URL API Google Apps Script belum dipasang di file .env");
  }

  const response = await fetch(API_URL, {
    method: "GET",
    redirect: "follow",
  });

  const result = await response.json();
  if (result.status !== "success") {
    throw new Error(result.message || "Gagal mengambil data dari server");
  }

  // Fallback debts dari localStorage jika backend GAS belum di-redeploy
  let debts = result.data.debts;
  if (!debts || !Array.isArray(debts)) {
    try {
      debts = JSON.parse(localStorage.getItem("fmt_debts") || "[]");
    } catch {
      debts = [];
    }
  } else {
    try {
      localStorage.setItem("fmt_debts", JSON.stringify(debts));
    } catch {}
  }

  return {
    ...result.data,
    debts,
  };
};

/**
 * Mengirim aksi (POST) ke Google Apps Script bebas error CORS
 */
const postToGAS = async (payload) => {
  const response = await fetch(API_URL, {
    method: "POST",
    redirect: "follow",
    headers: {
      // Trik Senior Dev: Gunakan text/plain agar browser tidak mengirim preflight OPTIONS yang ditolak GAS
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (result.status !== "success") {
    throw new Error(result.message || "Terjadi kesalahan pada server GAS");
  }
  return result;
};

/**
 * Aksi 1: Tambah Transaksi Baru (Masuk / Keluar / Mutasi + Bukti Struk Drive)
 */
export const addTransaction = async (trxData) => {
  return await postToGAS({
    action: "ADD_TRANSACTION",
    ...trxData,
  });
};

/**
 * Aksi 2: Hapus Transaksi (Sekaligus hapus struk di Drive)
 */
export const deleteTransaction = async (id) => {
  return await postToGAS({
    action: "DELETE_TRANSACTION",
    id,
  });
};

/**
 * Aksi 3: Tambah Kantong Saldo Baru (Wallet)
 */
export const addWallet = async (walletData) => {
  return await postToGAS({
    action: "ADD_WALLET",
    ...walletData,
  });
};

/**
 * Aksi 4: Tambah Kategori Baru (Income / Expense)
 */
export const addCategory = async (categoryData) => {
  return await postToGAS({
    action: "ADD_CATEGORY",
    ...categoryData,
  });
};

/**
 * Aksi 5: Update/Edit Kantong Saldo (Wallet)
 */
export const updateWallet = async (walletData) => {
  return await postToGAS({
    action: "UPDATE_WALLET",
    ...walletData,
  });
};

/**
 * Aksi 6: Hapus Kantong Saldo (Wallet)
 */
export const deleteWallet = async (id) => {
  return await postToGAS({
    action: "DELETE_WALLET",
    id,
  });
};

/**
 * Aksi 7: Update/Edit Kategori (Income / Expense)
 */
export const updateCategory = async (categoryData) => {
  return await postToGAS({
    action: "UPDATE_CATEGORY",
    ...categoryData,
  });
};

/**
 * Aksi 8: Hapus Kategori
 */
export const deleteCategory = async (id) => {
  return await postToGAS({
    action: "DELETE_CATEGORY",
    id,
  });
};

/**
 * Aksi 9: Update/Edit Transaksi (+ Ganti Struk jika ada)
 */
export const updateTransaction = async (trxData) => {
  return await postToGAS({
    action: "UPDATE_TRANSACTION",
    ...trxData,
  });
};

/**
 * Aksi 10: Tambah Tagihan / Hutang Baru
 */
export const addDebt = async (debtData) => {
  try {
    return await postToGAS({
      action: "ADD_DEBT",
      ...debtData,
    });
  } catch (err) {
    console.warn("Sinkronisasi GAS: Menggunakan fallback penyimpanan lokal:", err.message);
    return { status: "success", id: "d-" + Date.now(), message: "Tersimpan lokal" };
  }
};

/**
 * Aksi 11: Update/Edit Tagihan / Hutang
 */
export const updateDebt = async (debtData) => {
  try {
    return await postToGAS({
      action: "UPDATE_DEBT",
      ...debtData,
    });
  } catch (err) {
    console.warn("Sinkronisasi GAS: Menggunakan fallback penyimpanan lokal:", err.message);
    return { status: "success", message: "Tersimpan lokal" };
  }
};

/**
 * Aksi 12: Hapus Tagihan / Hutang
 */
export const deleteDebt = async (id) => {
  try {
    return await postToGAS({
      action: "DELETE_DEBT",
      id,
    });
  } catch (err) {
    console.warn("Sinkronisasi GAS: Menggunakan fallback penyimpanan lokal:", err.message);
    return { status: "success", message: "Dihapus lokal" };
  }
};

/**
 * Aksi 13: Bayar Tagihan / Cicilan (Catat Transaksi + Update Sisa Hutang)
 */
export const payDebt = async (paymentData) => {
  try {
    return await postToGAS({
      action: "PAY_DEBT",
      ...paymentData,
    });
  } catch (err) {
    console.warn("Sinkronisasi GAS: Menggunakan fallback pembayaran lokal:", err.message);
    // Jika GAS belum update endpoint PAY_DEBT, fallback: buat transaksi via ADD_TRANSACTION biasa
    const isReceivable = paymentData.type === "DEBT_RECEIVABLE";
    const trxType = isReceivable ? "INCOME" : "EXPENSE";
    const trxRes = await addTransaction({
      date: paymentData.date,
      type: trxType,
      amount: paymentData.amount,
      category_id: paymentData.category_id || "",
      from_wallet_id: isReceivable ? "" : paymentData.wallet_id,
      to_wallet_id: isReceivable ? paymentData.wallet_id : "",
      actor: paymentData.actor || "Suami",
      notes: paymentData.notes || ("Bayar " + (paymentData.title || "Tagihan")),
      receipt_base64: paymentData.receipt_base64,
      receipt_name: paymentData.receipt_name,
      receipt_mime: paymentData.receipt_mime,
    });
    return {
      status: "success",
      message: "Pembayaran dicatat",
      trx_id: trxRes.id,
      receipt_url: trxRes.receipt_url,
      receipt_file_id: trxRes.receipt_file_id,
    };
  }
};

/**
 * HELPER: Kompresi Foto Struk Kamera HP (Maks lebar 1000px, Kualitas 70%)
 * Mengembalikan Base64 yang ringan (~100-200KB) agar upload ke Drive cepat
 */
export const compressImageToBase64 = (file, maxWidth = 1000, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve({
          base64: compressedBase64,
          name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          mime: "image/jpeg",
        });
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};