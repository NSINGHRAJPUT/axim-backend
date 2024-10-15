const express = require("express");
const multer = require("multer");
const cors = require("cors");
const bodyParser = require("body-parser");
const xlsx = require("xlsx");
const app = express();
const fs = require("fs");

app.use(cors());
app.use(bodyParser.json());

let transactions = []; // In-memory storage for transactions

// Multer setup for file upload
const upload = multer({ dest: "uploads/" });

// Route to upload an Excel file
app.post("/api/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("No file uploaded.");
  }

  // Parse the Excel file
  const workbook = xlsx.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  // Adjust mapping and skip rows without a date
  transactions = data
    .filter(
      (row) =>
        row["DETAILED STATEMENT"] &&
        !isNaN(row["DETAILED STATEMENT"]) &&
        row["__EMPTY_1"]
    ) // Only include rows where the date exists
    .map((row, index) => ({
      id: row["DETAILED STATEMENT"], // Transaction number from 'DETAILED STATEMENT' column
      transactionId: row["__EMPTY"], // The transaction ID from '__EMPTY'
      date: row["__EMPTY_1"], // The date from '__EMPTY_1'
      description: row["__EMPTY_4"], // Description from '__EMPTY_4'
      creditDebit: row["__EMPTY_5"], // Credit/Debit info from '__EMPTY_5'
      amount: row["__EMPTY_6"], // Amount from '__EMPTY_6'
    }));

  // Delete the file after processing
  fs.unlink(file.path, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res.status(500).send("Error processing file.");
    }
  });

  res.json({ message: "File uploaded and data processed", transactions });
});

// Route to manually add a transaction
app.post("/api/manual", async (req, res) => {
  try {
    const { date, description, creditDebit, amount } = req.body;
    const newTransaction = {
      id: transactions.length + 1,
      date,
      description,
      creditDebit,
      amount,
    };

    transactions.push(newTransaction);

    res.json({
      message: "Transaction added manually",
      transaction: newTransaction,
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Route to send selected transactions
app.post("/api/submit", async (req, res) => {
  try {
    const { finalSelected } = req.body;
    console.log(finalSelected);

    res.json({
      message: "Selected transactions sent",
      transactions: finalSelected,
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on${PORT}`);
});
