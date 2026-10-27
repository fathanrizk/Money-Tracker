/**
 * BACKEND API: FAMILY MONEY TRACKER
 * Tech Stack: Google Apps Script + Google Sheets + Google Drive
 * Status: v1.2 — Field total_in & total_out ditambahkan ke kalkulasi wallet
 */

// ID Folder Google Drive untuk menyimpan bukti struk transaksi
const DRIVE_FOLDER_ID = "146329r4I4jDhI_vULYcsz4MujIci0dGe";

/**
 * FUNGSI INISIALISASI OTOMATIS (Jalankan 1x saja dari Editor GAS)
 * Otomatis membuat Sheet Wallets, Categories, Transactions beserta data awal
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Setup Sheet: Wallets
  let walletSheet = ss.getSheetByName("Wallets");
  if (!walletSheet) {
    walletSheet = ss.insertSheet("Wallets");
    walletSheet.appendRow(["id", "name", "type", "initial_balance", "color", "is_active"]);
    // Data Awal Contoh
    walletSheet.appendRow(["w-1", "Bank A - Utama", "Bank", 10000000, "blue", true]);
    walletSheet.appendRow(["w-2", "Bank B - Tabungan", "Bank", 5000000, "emerald", true]);
    walletSheet.appendRow(["w-3", "Saldo Uang Jajan", "Pos Virtual", 1000000, "amber", true]);
  }

  // 2. Setup Sheet: Categories
  let categorySheet = ss.getSheetByName("Categories");
  if (!categorySheet) {
    categorySheet = ss.insertSheet("Categories");
    categorySheet.appendRow(["id", "name", "type", "icon"]);
    // Data Awal Pemasukan (INCOME)
    categorySheet.appendRow(["c-1", "Gaji Pokok", "INCOME", "Briefcase"]);
    categorySheet.appendRow(["c-2", "Honor Proyek", "INCOME", "Award"]);
    categorySheet.appendRow(["c-3", "Pemberian / Hadiah", "INCOME", "Gift"]);
    // Data Awal Pengeluaran (EXPENSE)
    categorySheet.appendRow(["c-4", "Belanja Dapur", "EXPENSE", "ShoppingBag"]);
    categorySheet.appendRow(["c-5", "Makan & Kopi", "EXPENSE", "Coffee"]);
    categorySheet.appendRow(["c-6", "Tagihan & Utilitas", "EXPENSE", "Zap"]);
    categorySheet.appendRow(["c-7", "Transportasi", "EXPENSE", "Car"]);
  }

  // 3. Setup Sheet: Transactions
  let trxSheet = ss.getSheetByName("Transactions");
  if (!trxSheet) {
    trxSheet = ss.insertSheet("Transactions");
    trxSheet.appendRow([
      "id", "date", "type", "amount", "category_id",
      "from_wallet_id", "to_wallet_id", "actor", "notes",
      "receipt_url", "receipt_file_id", "created_at"
    ]);
  }

  // 4. Setup Sheet: Debts (Tagihan Rutin, Cicilan, Hutang & Piutang)
  let debtSheet = ss.getSheetByName("Debts");
  if (!debtSheet) {
    debtSheet = ss.insertSheet("Debts");
    debtSheet.appendRow([
      "id", "title", "type", "category_id",
      "total_amount", "installment_amount", "remaining_amount",
      "due_day", "last_paid_at", "last_paid_period",
      "actor", "notes", "is_active", "created_at"
    ]);
    debtSheet.appendRow([
      "d-1", "Tagihan Wifi & Internet", "BILL", "c-6",
      350000, 350000, 350000,
      15, "", "",
      "Bersama", "Paket 50 Mbps", true, new Date().toISOString()
    ]);
    debtSheet.appendRow([
      "d-2", "Listrik & Air Bulanan", "BILL", "c-6",
      500000, 500000, 500000,
      20, "", "",
      "Bersama", "Pasca bayar PLN & PDAM", true, new Date().toISOString()
    ]);
  }

  // Hapus Sheet1 bawaan jika masih ada
  const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Lembar1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log("✅ Database berhasil disiapkan!");
}

/**
 * JALANKAN INI 1x DARI EDITOR GAS JIKA MUNCUL "Akses ditolak: DriveApp"
 * Berfungsi untuk memicu popup otorisasi izin akses Google Drive
 */
function authorizeDriveAccess() {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  Logger.log("✅ Izin Google Drive berhasil diberikan! Terhubung ke folder: " + folder.getName());
}

/**
 * HANDLER GET: Mengambil seluruh data (Wallets + Saldo Terhitung, Categories, Transactions)
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const wallets = getSheetData(ss.getSheetByName("Wallets"));
    const categories = getSheetData(ss.getSheetByName("Categories"));
    const transactions = getSheetData(ss.getSheetByName("Transactions"));
    const debtSheet = ss.getSheetByName("Debts");
    const debts = debtSheet ? getSheetData(debtSheet) : [];

    // Hitung Saldo Bergerak (Dynamic Balance) + total_in + total_out untuk setiap Kantong
    const calculatedWallets = wallets.map(w => {
      let currentBalance = Number(w.initial_balance) || 0;
      let totalIn = 0;   // Akumulasi semua uang yang masuk ke kantong ini
      let totalOut = 0;  // Akumulasi semua uang yang keluar dari kantong ini

      transactions.forEach(t => {
        const amt = Number(t.amount) || 0;

        if (t.type === "INCOME" && t.to_wallet_id === w.id) {
          currentBalance += amt;
          totalIn += amt;
        } else if (t.type === "EXPENSE" && t.from_wallet_id === w.id) {
          currentBalance -= amt;
          totalOut += amt;
        } else if (t.type === "TRANSFER") {
          if (t.from_wallet_id === w.id) {
            currentBalance -= amt;
            totalOut += amt;
          }
          if (t.to_wallet_id === w.id) {
            currentBalance += amt;
            totalIn += amt;
          }
        }
      });

      return {
        ...w,
        initial_balance: Number(w.initial_balance) || 0,
        current_balance: currentBalance,
        total_in: totalIn,    // ← BARU: dipakai oleh WalletsView.jsx
        total_out: totalOut   // ← BARU: dipakai oleh WalletsView.jsx
      };
    });

    // Urutkan transaksi dari yang terbaru
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return jsonResponse({
      status: "success",
      data: {
        wallets: calculatedWallets,
        categories: categories,
        transactions: transactions,
        debts: debts
      }
    });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * HANDLER POST: Menerima aksi dari React (Tambah/Hapus Transaksi, Tambah Kantong, Tambah Kategori)
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. TAMBAH TRANSAKSI BARU (+ UPLOAD BUKTI KE GOOGLE DRIVE)
    if (action === "ADD_TRANSACTION") {
      const trxSheet = ss.getSheetByName("Transactions");
      const id = "trx-" + new Date().getTime();
      const createdAt = new Date().toISOString();

      let receiptUrl = "";
      let receiptFileId = "";

      // Jika ada lampiran foto struk (Base64)
      if (payload.receipt_base64 && payload.receipt_base64.length > 100) {
        try {
          const uploadResult = uploadReceiptToDrive(
            payload.receipt_base64,
            payload.receipt_name || ("Struk_" + id + ".jpg"),
            payload.receipt_mime || "image/jpeg"
          );
          receiptUrl = uploadResult.url;
          receiptFileId = uploadResult.fileId;
        } catch (driveErr) {
          Logger.log("Peringatan upload struk ke Google Drive: " + driveErr.toString());
        }
      }

      trxSheet.appendRow([
        id,
        payload.date,
        payload.type, // INCOME | EXPENSE | TRANSFER
        Number(payload.amount),
        payload.category_id || "",
        payload.from_wallet_id || "",
        payload.to_wallet_id || "",
        payload.actor || "Suami",
        payload.notes || "",
        receiptUrl,
        receiptFileId,
        createdAt
      ]);

      return jsonResponse({
        status: "success",
        message: "Transaksi berhasil disimpan",
        id: id,
        receipt_url: receiptUrl,
        receipt_file_id: receiptFileId
      });
    }

    // 2. HAPUS TRANSAKSI
    if (action === "DELETE_TRANSACTION") {
      const trxSheet = ss.getSheetByName("Transactions");
      const data = trxSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          // Hapus file struk di Google Drive jika ada
          const fileId = data[i][10];
          if (fileId) {
            try { DriveApp.getFileById(fileId).setTrashed(true); } catch (err) {}
          }
          trxSheet.deleteRow(i + 1);
          return jsonResponse({ status: "success", message: "Transaksi dihapus" });
        }
      }
      return jsonResponse({ status: "error", message: "ID Transaksi tidak ditemukan" });
    }

    // 3. TAMBAH KANTONG SALDO BARU (WALLET)
    if (action === "ADD_WALLET") {
      const walletSheet = ss.getSheetByName("Wallets");
      const id = "w-" + new Date().getTime();
      walletSheet.appendRow([
        id,
        payload.name,
        payload.type || "Bank",
        Number(payload.initial_balance) || 0,
        payload.color || "blue",
        true
      ]);
      return jsonResponse({ status: "success", message: "Kantong baru berhasil ditambahkan", id: id });
    }

    // 4. TAMBAH KATEGORI BARU
    if (action === "ADD_CATEGORY") {
      const categorySheet = ss.getSheetByName("Categories");
      const id = "c-" + new Date().getTime();
      categorySheet.appendRow([
        id,
        payload.name,
        payload.type, // INCOME | EXPENSE
        payload.icon || "Tag"
      ]);
      return jsonResponse({ status: "success", message: "Kategori baru berhasil ditambahkan", id: id });
    }

    // 5. UPDATE KANTONG (WALLET)
    if (action === "UPDATE_WALLET") {
      const walletSheet = ss.getSheetByName("Wallets");
      const data = walletSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          const row = i + 1;
          if (payload.name !== undefined) walletSheet.getRange(row, 2).setValue(payload.name);
          if (payload.type !== undefined) walletSheet.getRange(row, 3).setValue(payload.type);
          if (payload.initial_balance !== undefined) walletSheet.getRange(row, 4).setValue(Number(payload.initial_balance) || 0);
          if (payload.color !== undefined) walletSheet.getRange(row, 5).setValue(payload.color);
          return jsonResponse({ status: "success", message: "Kantong berhasil diperbarui" });
        }
      }
      return jsonResponse({ status: "error", message: "ID Kantong tidak ditemukan" });
    }

    // 6. HAPUS KANTONG (WALLET)
    if (action === "DELETE_WALLET") {
      const walletSheet = ss.getSheetByName("Wallets");
      const data = walletSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          walletSheet.deleteRow(i + 1);
          return jsonResponse({ status: "success", message: "Kantong berhasil dihapus" });
        }
      }
      return jsonResponse({ status: "error", message: "ID Kantong tidak ditemukan" });
    }

    // 7. UPDATE KATEGORI
    if (action === "UPDATE_CATEGORY") {
      const categorySheet = ss.getSheetByName("Categories");
      const data = categorySheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          const row = i + 1;
          if (payload.name !== undefined) categorySheet.getRange(row, 2).setValue(payload.name);
          if (payload.type !== undefined) categorySheet.getRange(row, 3).setValue(payload.type);
          if (payload.icon !== undefined) categorySheet.getRange(row, 4).setValue(payload.icon);
          return jsonResponse({ status: "success", message: "Kategori berhasil diperbarui" });
        }
      }
      return jsonResponse({ status: "error", message: "ID Kategori tidak ditemukan" });
    }

    // 8. HAPUS KATEGORI
    if (action === "DELETE_CATEGORY") {
      const categorySheet = ss.getSheetByName("Categories");
      const data = categorySheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          categorySheet.deleteRow(i + 1);
          return jsonResponse({ status: "success", message: "Kategori berhasil dihapus" });
        }
      }
      return jsonResponse({ status: "error", message: "ID Kategori tidak ditemukan" });
    }

    // 9. UPDATE TRANSAKSI
    if (action === "UPDATE_TRANSACTION") {
      const trxSheet = ss.getSheetByName("Transactions");
      const data = trxSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          const row = i + 1;
          if (payload.date !== undefined) trxSheet.getRange(row, 2).setValue(payload.date);
          if (payload.type !== undefined) trxSheet.getRange(row, 3).setValue(payload.type);
          if (payload.amount !== undefined) trxSheet.getRange(row, 4).setValue(Number(payload.amount));
          if (payload.category_id !== undefined) trxSheet.getRange(row, 5).setValue(payload.category_id || "");
          if (payload.from_wallet_id !== undefined) trxSheet.getRange(row, 6).setValue(payload.from_wallet_id || "");
          if (payload.to_wallet_id !== undefined) trxSheet.getRange(row, 7).setValue(payload.to_wallet_id || "");
          if (payload.actor !== undefined) trxSheet.getRange(row, 8).setValue(payload.actor || "Suami");
          if (payload.notes !== undefined) trxSheet.getRange(row, 9).setValue(payload.notes || "");

          if (payload.receipt_base64 && payload.receipt_base64.length > 100) {
            try {
              const oldFileId = data[i][10];
              if (oldFileId) {
                try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch (err) {}
              }
              const uploadResult = uploadReceiptToDrive(
                payload.receipt_base64,
                payload.receipt_name || ("Struk_" + payload.id + ".jpg"),
                payload.receipt_mime || "image/jpeg"
              );
              trxSheet.getRange(row, 10).setValue(uploadResult.url);
              trxSheet.getRange(row, 11).setValue(uploadResult.fileId);
            } catch (driveErr) {
              Logger.log("Peringatan upload struk ke Google Drive: " + driveErr.toString());
            }
          }
          return jsonResponse({
            status: "success",
            message: "Transaksi berhasil diperbarui",
            receipt_url: trxSheet.getRange(row, 10).getValue(),
            receipt_file_id: trxSheet.getRange(row, 11).getValue()
          });
        }
      }
      return jsonResponse({ status: "error", message: "ID Transaksi tidak ditemukan" });
    }

    // 10. TAMBAH TAGIHAN / HUTANG BARU
    if (action === "ADD_DEBT") {
      let debtSheet = ss.getSheetByName("Debts");
      if (!debtSheet) {
        debtSheet = ss.insertSheet("Debts");
        debtSheet.appendRow([
          "id", "title", "type", "category_id",
          "total_amount", "installment_amount", "remaining_amount",
          "due_day", "last_paid_at", "last_paid_period",
          "actor", "notes", "is_active", "created_at"
        ]);
      }
      const id = "d-" + new Date().getTime();
      const totalAmount = Number(payload.total_amount) || 0;
      let installmentAmount = Number(payload.installment_amount) || totalAmount;
      let remainingAmount = payload.remaining_amount !== undefined ? Number(payload.remaining_amount) : totalAmount;

      if (payload.type === "BILL") {
        installmentAmount = totalAmount;
        remainingAmount = totalAmount;
      }

      debtSheet.appendRow([
        id,
        payload.title || "Tagihan",
        payload.type || "BILL", // BILL | DEBT_PAYABLE | DEBT_RECEIVABLE
        payload.category_id || "",
        totalAmount,
        installmentAmount,
        remainingAmount,
        Number(payload.due_day) || 1,
        payload.last_paid_at || "",
        payload.last_paid_period || "",
        payload.actor || "Bersama",
        payload.notes || "",
        true,
        new Date().toISOString()
      ]);

      return jsonResponse({ status: "success", message: "Data berhasil disimpan", id: id });
    }

    // 11. UPDATE TAGIHAN / HUTANG
    if (action === "UPDATE_DEBT") {
      const debtSheet = ss.getSheetByName("Debts");
      if (!debtSheet) return jsonResponse({ status: "error", message: "Sheet Debts belum tersedia" });
      const data = debtSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          const row = i + 1;
          if (payload.title !== undefined) debtSheet.getRange(row, 2).setValue(payload.title);
          if (payload.type !== undefined) debtSheet.getRange(row, 3).setValue(payload.type);
          if (payload.category_id !== undefined) debtSheet.getRange(row, 4).setValue(payload.category_id || "");
          if (payload.total_amount !== undefined) debtSheet.getRange(row, 5).setValue(Number(payload.total_amount) || 0);
          if (payload.installment_amount !== undefined) debtSheet.getRange(row, 6).setValue(Number(payload.installment_amount) || 0);
          if (payload.remaining_amount !== undefined) debtSheet.getRange(row, 7).setValue(Number(payload.remaining_amount) || 0);
          if (payload.due_day !== undefined) debtSheet.getRange(row, 8).setValue(Number(payload.due_day) || 1);
          if (payload.last_paid_at !== undefined) debtSheet.getRange(row, 9).setValue(payload.last_paid_at || "");
          if (payload.last_paid_period !== undefined) debtSheet.getRange(row, 10).setValue(payload.last_paid_period || "");
          if (payload.actor !== undefined) debtSheet.getRange(row, 11).setValue(payload.actor || "Bersama");
          if (payload.notes !== undefined) debtSheet.getRange(row, 12).setValue(payload.notes || "");
          if (payload.is_active !== undefined) debtSheet.getRange(row, 13).setValue(payload.is_active);
          return jsonResponse({ status: "success", message: "Data berhasil diperbarui" });
        }
      }
      return jsonResponse({ status: "error", message: "ID Tagihan/Hutang tidak ditemukan" });
    }

    // 12. HAPUS TAGIHAN / HUTANG
    if (action === "DELETE_DEBT") {
      const debtSheet = ss.getSheetByName("Debts");
      if (!debtSheet) return jsonResponse({ status: "error", message: "Sheet Debts belum tersedia" });
      const data = debtSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === payload.id) {
          debtSheet.deleteRow(i + 1);
          return jsonResponse({ status: "success", message: "Data berhasil dihapus" });
        }
      }
      return jsonResponse({ status: "error", message: "ID Tagihan/Hutang tidak ditemukan" });
    }

    // 13. BAYAR TAGIHAN / CICILAN (Catat Transaksi + Update Sisa Hutang/Status)
    if (action === "PAY_DEBT") {
      const debtSheet = ss.getSheetByName("Debts");
      const trxSheet = ss.getSheetByName("Transactions");
      const trxId = "trx-" + new Date().getTime();
      const createdAt = new Date().toISOString();
      const paymentAmount = Number(payload.amount) || 0;
      const paymentDate = payload.date || new Date().toISOString().split("T")[0];

      let receiptUrl = "";
      let receiptFileId = "";

      if (payload.receipt_base64 && payload.receipt_base64.length > 100) {
        try {
          const uploadResult = uploadReceiptToDrive(
            payload.receipt_base64,
            payload.receipt_name || ("Struk_" + trxId + ".jpg"),
            payload.receipt_mime || "image/jpeg"
          );
          receiptUrl = uploadResult.url;
          receiptFileId = uploadResult.fileId;
        } catch (driveErr) {
          Logger.log("Peringatan upload struk pembayaran: " + driveErr.toString());
        }
      }

      // Catat ke Transactions
      const isReceivable = payload.type === "DEBT_RECEIVABLE";
      const trxType = isReceivable ? "INCOME" : "EXPENSE";

      trxSheet.appendRow([
        trxId,
        paymentDate,
        trxType,
        paymentAmount,
        payload.category_id || "",
        isReceivable ? "" : (payload.wallet_id || ""),
        isReceivable ? (payload.wallet_id || "") : "",
        payload.actor || "Suami",
        payload.notes || ("Bayar " + (payload.title || "Tagihan")),
        receiptUrl,
        receiptFileId,
        createdAt
      ]);

      // Update data di Sheet Debts jika debt_id ada
      let updatedRemaining = 0;
      if (debtSheet && payload.debt_id) {
        const debtData = debtSheet.getDataRange().getValues();
        for (let i = 1; i < debtData.length; i++) {
          if (debtData[i][0] === payload.debt_id) {
            const row = i + 1;
            const currentRemaining = Number(debtData[i][6]) || 0;
            const currentPeriod = paymentDate.substring(0, 7); // YYYY-MM

            if (payload.type === "BILL") {
              // Untuk tagihan rutin, tandai periode bayar bulan ini
              debtSheet.getRange(row, 9).setValue(paymentDate);
              debtSheet.getRange(row, 10).setNumberFormat("@").setValue("'" + currentPeriod);
              updatedRemaining = debtData[i][4]; // total_amount
            } else {
              // Untuk cicilan/hutang, kurangi sisa pokok
              updatedRemaining = Math.max(0, currentRemaining - paymentAmount);
              debtSheet.getRange(row, 7).setValue(updatedRemaining);
              debtSheet.getRange(row, 9).setValue(paymentDate);
              debtSheet.getRange(row, 10).setNumberFormat("@").setValue("'" + currentPeriod);
            }
            break;
          }
        }
      }

      return jsonResponse({
        status: "success",
        message: "Pembayaran berhasil dicatat",
        trx_id: trxId,
        remaining_amount: updatedRemaining,
        receipt_url: receiptUrl,
        receipt_file_id: receiptFileId
      });
    }

    return jsonResponse({ status: "error", message: "Action tidak dikenali: " + action });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * HELPER: Upload Base64 Image ke Google Drive
 */
function uploadReceiptToDrive(base64Data, fileName, mimeType) {
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  // Bersihkan prefix data:image/jpeg;base64, jika ada
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const decoded = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(decoded, mimeType, fileName);

  const file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    Logger.log("Peringatan: Gagal setSharing link: " + shareErr.toString());
  }

  return {
    fileId: file.getId(),
    // URL thumbnail resolusi tinggi agar bisa langsung ditampilkan di <img> React
    url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000"
  };
}

/**
 * HELPER: Konversi Baris Sheet menjadi Array of Objects (JSON)
 */
function getSheetData(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0];
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = rows[i][j];
      if (headers[j] === "last_paid_period" && val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM");
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

/**
 * HELPER: Output JSON Standar dengan header CORS
 */
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
